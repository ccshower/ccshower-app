import {
  parseFichaTecnicaImportPayload,
  type FichaTecnicaImportPayload,
  type FichaTecnicaWebhookPayload,
  resolveFichaTecnicaCallbackPath,
  resolveFichaTecnicaCallbackUrl,
} from "@/lib/ordens-servico/os-ficha-tecnica";
import { syncSeparationListFromPdfItems } from "@/lib/ordens-servico/os-ficha-to-separation-list";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

const N8N_WEBHOOK_FICHA_TECNICA_URL =
  process.env.N8N_WEBHOOK_FICHA_TECNICA_URL?.trim() ?? "";

/** Dados serializáveis para disparar o webhook após o upload (ex.: `after()` na Vercel). */
export type FichaTecnicaWebhookJob = {
  osId: string;
  osAnexoId: string;
  osAmbienteId: string | null;
  empresaId: string;
  storagePath: string;
  mimeType: string;
  nomeArquivo: string;
  signedUrl: string | null;
};

export function isN8nFichaTecnicaWebhookConfigured(): boolean {
  return Boolean(N8N_WEBHOOK_FICHA_TECNICA_URL);
}

export function verifyN8nWebhookSecret(request: Request): boolean {
  const expected = process.env.N8N_WEBHOOK_SECRET?.trim();
  if (!expected) return false;

  const auth = request.headers.get("authorization")?.trim();
  if (auth === `Bearer ${expected}`) return true;

  const header = request.headers.get("x-n8n-webhook-secret")?.trim();
  return header === expected;
}

export async function dispatchFichaTecnicaWebhook(
  params: FichaTecnicaWebhookJob,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isN8nFichaTecnicaWebhookConfigured()) {
    return {
      ok: false,
      message: "N8N_WEBHOOK_FICHA_TECNICA_URL nao configurada",
    };
  }

  const payload: FichaTecnicaWebhookPayload = {
    event: "cnc_pdf_uploaded",
    os_id: params.osId,
    os_anexo_id: params.osAnexoId,
    os_ambiente_id: params.osAmbienteId,
    empresa_id: params.empresaId,
    storage_path: params.storagePath,
    signed_url: params.signedUrl,
    mime_type: params.mimeType,
    nome_arquivo: params.nomeArquivo,
    callback_path: resolveFichaTecnicaCallbackPath(),
  };

  const callbackUrl = resolveFichaTecnicaCallbackUrl();
  const callbackSecret = process.env.N8N_WEBHOOK_SECRET?.trim() ?? "";
  const body =
    callbackUrl && callbackSecret
      ? { ...payload, callback_url: callbackUrl, callback_secret: callbackSecret }
      : callbackUrl
        ? { ...payload, callback_url: callbackUrl }
        : payload;

  if (callbackUrl && !callbackSecret) {
    console.warn(
      "[ficha-tecnica] APP_BASE_URL definido mas N8N_WEBHOOK_SECRET ausente — o n8n nao conseguira gravar itens via callback",
    );
  }

  try {
    const res = await fetch(N8N_WEBHOOK_FICHA_TECNICA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(
        "[ficha-tecnica] webhook N8N respondeu com erro:",
        res.status,
        detail,
      );
      return {
        ok: false,
        message: `Webhook N8N retornou HTTP ${res.status}`,
      };
    }

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao chamar webhook N8N";
    console.error("[ficha-tecnica] falha ao chamar webhook N8N:", error);
    return { ok: false, message };
  }
}

async function registrarEventoFichaImportada(
  supabase: SupabaseClient,
  params: {
    ordem_servico_id: string;
    cliente_id: string;
    equipe_id: string;
    responsavel_id: string | null;
    itemCount: number;
    os_anexo_id: string;
  },
): Promise<string | null> {
  const { error } = await supabase.from("agenda_eventos").insert({
    ordem_servico_id: params.ordem_servico_id,
    cliente_id: params.cliente_id,
    equipe_id: params.equipe_id,
    responsavel_id: params.responsavel_id,
    tipo_evento: "cnc_ficha_importada",
    etapa: "project",
    status: "completed",
    titulo: "cnc_ficha_importada",
    descricao: JSON.stringify({
      os_anexo_id: params.os_anexo_id,
      item_count: params.itemCount,
    }),
    data_inicio: new Date().toISOString(),
    data_fim: new Date().toISOString(),
  });

  return error?.message ?? null;
}

export async function importFichaTecnicaFromN8n(
  payload: FichaTecnicaImportPayload,
): Promise<{ ok: true; item_count: number } | { ok: false; message: string }> {
  const supabase = createAdminClient();

  const { data: anexo, error: anexoErr } = await supabase
    .from("os_anexos")
    .select(
      "id, ordem_servico_id, os_ambiente_id, mime_type, ficha_import_status",
    )
    .eq("id", payload.os_anexo_id)
    .maybeSingle();

  if (anexoErr || !anexo?.id) {
    return { ok: false, message: anexoErr?.message ?? "Anexo nao encontrado" };
  }

  if (anexo.mime_type !== "application/pdf") {
    return { ok: false, message: "Anexo nao e PDF de projeto" };
  }

  if (payload.status === "failed") {
    const { error } = await supabase
      .from("os_anexos")
      .update({
        ficha_import_status: "failed",
        ficha_import_error: payload.error ?? "Falha na extracao",
        ficha_imported_at: new Date().toISOString(),
      })
      .eq("id", payload.os_anexo_id);

    if (error) return { ok: false, message: error.message };
    return { ok: true, item_count: 0 };
  }

  const items = payload.items ?? [];
  const { data: os, error: osErr } = await supabase
    .from("ordens_servico")
    .select("id, cliente_id, equipe_id, equipe_atual_id, empresa_id")
    .eq("id", anexo.ordem_servico_id)
    .single();

  if (osErr || !os?.id) {
    return { ok: false, message: osErr?.message ?? "OS nao encontrada" };
  }

  const { error: delFichaErr } = await supabase
    .from("os_ficha_tecnica_items")
    .delete()
    .eq("os_anexo_id", payload.os_anexo_id);

  if (delFichaErr) return { ok: false, message: delFichaErr.message };

  const sync = await syncSeparationListFromPdfItems(supabase, {
    ordem_servico_id: anexo.ordem_servico_id as string,
    empresa_id: (os.empresa_id as string | null) ?? null,
    items,
  });
  if (!sync.ok) return sync;

  const { error: updErr } = await supabase
    .from("os_anexos")
    .update({
      ficha_import_status: "completed",
      ficha_import_error: null,
      ficha_imported_at: new Date().toISOString(),
    })
    .eq("id", payload.os_anexo_id);

  if (updErr) return { ok: false, message: updErr.message };

  const equipe_id =
    (os.equipe_atual_id as string | null) ?? (os.equipe_id as string | null);
  if (equipe_id) {
    const evErr = await registrarEventoFichaImportada(supabase, {
      ordem_servico_id: os.id as string,
      cliente_id: os.cliente_id as string,
      equipe_id,
      responsavel_id: null,
      itemCount: items.length,
      os_anexo_id: payload.os_anexo_id,
    });
    if (evErr) {
      console.error("[ficha-tecnica] falha ao registrar timeline:", evErr);
    }
  }

  return { ok: true, item_count: items.length };
}

export async function parseAndImportFichaTecnicaFromN8n(
  body: unknown,
): Promise<{ ok: true; item_count: number } | { ok: false; message: string }> {
  const parsed = parseFichaTecnicaImportPayload(body);
  if (!parsed.ok) return parsed;
  return importFichaTecnicaFromN8n(parsed.value);
}
