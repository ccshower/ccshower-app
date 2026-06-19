import { parseAmbienteValorInput } from "@/lib/ordens-servico/os-ambientes";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import {
  OS_ANEXOS_BUCKET,
  OS_ANEXO_TIPO_VISITA,
} from "@/lib/ordens-servico/visita-comercial";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_ANEXO_BYTES = 8 * 1024 * 1024;
export const MAX_ANEXOS_POR_UPLOAD = 10;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

export type UploadAnexosResult =
  | { ok: true; uploaded: number; id: string }
  | { ok: false; message: string };

/** Contexto da OS para upload multi-tenant. */
export type OsAnexoUploadContext = {
  id: string;
  empresa_id: string;
  etapa_atual: string;
  status: string;
};

export async function loadOsAnexoUploadContext(
  supabase: SupabaseClient,
  osId: string,
): Promise<{ os: OsAnexoUploadContext } | { error: string }> {
  const { data, error } = await supabase
    .from("ordens_servico")
    .select("id, empresa_id, etapa_atual, status")
    .eq("id", osId)
    .single();

  if (error || !data) {
    return { error: error?.message ?? "OS nao encontrada" };
  }

  const empresa_id = data.empresa_id as string | null;
  if (!empresa_id) {
    return {
      error:
        "OS sem empresa_id — vincule a ordem a uma empresa antes de anexar fotos",
    };
  }

  return {
    os: {
      id: data.id as string,
      empresa_id,
      etapa_atual: data.etapa_atual as string,
      status: data.status as string,
    },
  };
}

export function canUploadAnexosVisitaComercial(os: {
  etapa_atual: string;
  status: string;
}): boolean {
  if (parseOsStage(os.etapa_atual) !== "commercial") return false;
  if (os.status === "completed" || os.status === "cancelled") return false;
  return true;
}

type UploadBlob = File | Blob;

/** Next/Node FormData pode entregar Blob em vez de File — nao usar instanceof File. */
export function readMultipartFiles(formData: FormData, field = "files"): UploadBlob[] {
  const out: UploadBlob[] = [];
  for (const entry of formData.getAll(field)) {
    if (typeof entry === "string") continue;
    if (!entry || typeof entry !== "object") continue;
    if (!("arrayBuffer" in entry) || typeof entry.arrayBuffer !== "function") continue;
    if (!("size" in entry) || typeof entry.size !== "number" || entry.size <= 0) continue;
    out.push(entry as UploadBlob);
  }
  return out;
}

function uploadName(file: UploadBlob): string {
  if (file instanceof File && file.name.trim()) return file.name;
  return "photo.jpg";
}

export function resolveImageMimeType(file: UploadBlob): string {
  const t = file.type?.trim().toLowerCase();
  if (t && t.startsWith("image/")) return t;
  const ext = uploadName(file).split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "image/jpeg";
}

async function resolveAmbienteIdForUpload(
  supabase: SupabaseClient,
  os: OsAnexoUploadContext,
  formData: FormData,
  osAmbienteId: string | null,
): Promise<{ ok: true; id: string | null } | { ok: false; message: string }> {
  if (!osAmbienteId) return { ok: true, id: null };

  const { data: existing, error: findErr } = await supabase
    .from("os_ambientes")
    .select("id")
    .eq("id", osAmbienteId)
    .eq("ordem_servico_id", os.id)
    .eq("ativo", true)
    .maybeSingle();

  if (findErr) return { ok: false, message: findErr.message };
  if (existing?.id) return { ok: true, id: existing.id as string };

  const nomeRaw = formData.get("ambiente_nome");
  const nome = typeof nomeRaw === "string" ? nomeRaw.trim() : "";
  if (!nome) {
    return {
      ok: false,
      message: "Informe o nome do ambiente antes de adicionar fotos",
    };
  }

  const especificacoesRaw = formData.get("ambiente_especificacoes");
  const especificacoes =
    typeof especificacoesRaw === "string" ? especificacoesRaw.trim() : "";
  const valorRaw = formData.get("ambiente_valor_comercial");
  const valorParsed =
    typeof valorRaw === "string" ? parseAmbienteValorInput(valorRaw) : null;
  const sortRaw = formData.get("ambiente_sort_order");
  const sortOrder =
    typeof sortRaw === "string" && Number.isFinite(Number(sortRaw))
      ? Number(sortRaw)
      : 0;

  const payload = {
    ordem_servico_id: os.id,
    empresa_id: os.empresa_id,
    nome,
    especificacoes: especificacoes || null,
    valor_comercial: valorParsed,
    sort_order: sortOrder,
    ativo: true,
  };

  const { data: found } = await supabase
    .from("os_ambientes")
    .select("id")
    .eq("id", osAmbienteId)
    .maybeSingle();

  if (found?.id) {
    const { error: updErr } = await supabase
      .from("os_ambientes")
      .update(payload)
      .eq("id", osAmbienteId);
    if (updErr) return { ok: false, message: updErr.message };
  } else {
    const { error: insErr } = await supabase.from("os_ambientes").insert({
      id: osAmbienteId,
      ...payload,
    });
    if (insErr) return { ok: false, message: insErr.message };
  }

  return { ok: true, id: osAmbienteId };
}

export async function uploadAnexosVisitaComercialFromFormData(
  supabase: SupabaseClient,
  userId: string,
  os: OsAnexoUploadContext,
  formData: FormData,
  osAmbienteId?: string | null,
): Promise<UploadAnexosResult> {
  const osId = os.id;

  if (!canUploadAnexosVisitaComercial(os)) {
    return { ok: false, message: "OS nao esta na etapa comercial para anexos" };
  }

  const ambienteResolved = await resolveAmbienteIdForUpload(
    supabase,
    os,
    formData,
    osAmbienteId ?? null,
  );
  if (!ambienteResolved.ok) return ambienteResolved;
  const ambienteId = ambienteResolved.id;

  const files = readMultipartFiles(formData);
  if (files.length === 0) {
    return { ok: false, message: "Nenhum arquivo selecionado" };
  }
  if (files.length > MAX_ANEXOS_POR_UPLOAD) {
    return { ok: false, message: `Maximo ${MAX_ANEXOS_POR_UPLOAD} arquivos por envio` };
  }

  let uploaded = 0;
  for (const file of files) {
    const contentType = resolveImageMimeType(file);
    if (!contentType.startsWith("image/")) {
      return { ok: false, message: "Apenas imagens sao permitidas" };
    }
    if (file.size > MAX_ANEXO_BYTES) {
      return { ok: false, message: `Arquivo ${uploadName(file)} excede 8 MB` };
    }

    const ext = uploadName(file).split(".").pop()?.toLowerCase() || "jpg";
    const path = `${osId}/technical_visit/${crypto.randomUUID()}.${ext}`;
    const body = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from(OS_ANEXOS_BUCKET)
      .upload(path, body, {
        contentType,
        upsert: false,
        cacheControl: "3600",
      });

    if (upErr) {
      return { ok: false, message: `Storage: ${upErr.message}` };
    }

    const { error: insErr } = await supabase.from("os_anexos").insert({
      empresa_id: os.empresa_id,
      ordem_servico_id: osId,
      os_ambiente_id: ambienteId,
      tipo: OS_ANEXO_TIPO_VISITA,
      storage_path: path,
      nome_arquivo: uploadName(file),
      mime_type: contentType,
      tamanho_bytes: file.size,
      criado_por: userId,
    });

    if (insErr) {
      await supabase.storage.from(OS_ANEXOS_BUCKET).remove([path]);
      return { ok: false, message: `Banco: ${insErr.message}` };
    }
    uploaded++;
  }

  return { ok: true, uploaded, id: osId };
}
