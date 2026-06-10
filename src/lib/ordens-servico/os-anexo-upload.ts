import {
  OS_ANEXOS_BUCKET,
  OS_ANEXO_TIPO_VISITA,
} from "@/lib/ordens-servico/visita-comercial";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
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

export function resolveImageMimeType(file: File): string {
  const t = file.type?.trim().toLowerCase();
  if (t && t.startsWith("image/")) return t;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "image/jpeg";
}

export async function uploadAnexosVisitaComercialFromFormData(
  supabase: SupabaseClient,
  userId: string,
  os: OsAnexoUploadContext,
  formData: FormData,
): Promise<UploadAnexosResult> {
  const osId = os.id;

  if (!canUploadAnexosVisitaComercial(os)) {
    return { ok: false, message: "OS nao esta na etapa comercial para anexos" };
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
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
      return { ok: false, message: `Arquivo ${file.name} excede 8 MB` };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
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
      tipo: OS_ANEXO_TIPO_VISITA,
      storage_path: path,
      nome_arquivo: file.name,
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
