import {
  OS_ANEXOS_BUCKET,
  OS_ANEXO_TIPO_PAYMENT_RECEIPT,
} from "@/lib/ordens-servico/visita-comercial";
import { canUploadAnexosVisitaComercial } from "@/lib/ordens-servico/os-anexo-upload";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { OsAnexoUploadContext } from "@/lib/ordens-servico/os-anexo-upload";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

const MAX_BYTES = 8 * 1024 * 1024;

export type UploadReceiptResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

function resolveReceiptMime(file: File): string | null {
  const t = file.type?.trim().toLowerCase();
  if (t === "application/pdf" || t.startsWith("image/")) return t;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? null;
}

export async function uploadPaymentReceipt(
  supabase: SupabaseClient,
  userId: string,
  os: OsAnexoUploadContext,
  file: File,
): Promise<UploadReceiptResult> {
  const osId = os.id;

  if (!canUploadAnexosVisitaComercial(os)) {
    return {
      ok: false,
      message: "OS não está na etapa comercial para anexar comprovante",
    };
  }

  const contentType = resolveReceiptMime(file);
  if (!contentType) {
    return { ok: false, message: "Use imagem (JPEG, PNG, WebP) ou PDF" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "Arquivo excede 8 MB" };
  }

  const { data: antigos } = await supabase
    .from("os_anexos")
    .select("id, storage_path")
    .eq("ordem_servico_id", osId)
    .eq("tipo", OS_ANEXO_TIPO_PAYMENT_RECEIPT);

  const ext =
    contentType === "application/pdf"
      ? "pdf"
      : file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${osId}/payment_receipt/${crypto.randomUUID()}.${ext}`;
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
    tipo: OS_ANEXO_TIPO_PAYMENT_RECEIPT,
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

  if (antigos?.length) {
    const paths = antigos.map((a) => a.storage_path as string);
    await supabase.storage.from(OS_ANEXOS_BUCKET).remove(paths);
    await supabase
      .from("os_anexos")
      .delete()
      .in(
        "id",
        antigos.map((a) => a.id as string),
      );
  }

  return { ok: true, id: osId };
}
