import {
  MAX_ANEXO_BYTES,
  MAX_ANEXOS_POR_UPLOAD,
  readMultipartFiles,
  resolveImageMimeType,
  type OsAnexoUploadContext,
} from "@/lib/ordens-servico/os-anexo-upload";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import {
  OS_ANEXOS_BUCKET,
  OS_ANEXO_TIPO_INSTALLATION,
  OS_ANEXO_TIPO_INSTALLATION_PAYMENT_RECEIPT,
} from "@/lib/ordens-servico/visita-comercial";
import type { SupabaseClient } from "@supabase/supabase-js";

export function canUploadInstallationArtifacts(os: {
  etapa_atual: string;
  status: string;
}): boolean {
  if (parseOsStage(os.etapa_atual) !== "installation") return false;
  if (os.status === "completed" || os.status === "cancelled") return false;
  return true;
}

async function resolveInstallationAmbienteId(
  supabase: SupabaseClient,
  os: OsAnexoUploadContext,
  osAmbienteId: string | null,
): Promise<{ ok: true; id: string | null } | { ok: false; message: string }> {
  if (!osAmbienteId) return { ok: true, id: null };

  const { data, error } = await supabase
    .from("os_ambientes")
    .select("id")
    .eq("id", osAmbienteId)
    .eq("ordem_servico_id", os.id)
    .eq("ativo", true)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data?.id) {
    return { ok: false, message: "Invalid environment for this work order." };
  }
  return { ok: true, id: data.id as string };
}

function uploadBlobName(file: File | Blob): string {
  if (file instanceof File && file.name.trim()) return file.name.trim();
  return "photo.jpg";
}

export type UploadInstallationPhotosResult =
  | { ok: true; uploaded: number; id: string }
  | { ok: false; message: string };

export async function uploadInstallationPhotosFromFormData(
  supabase: SupabaseClient,
  userId: string,
  os: OsAnexoUploadContext,
  formData: FormData,
): Promise<UploadInstallationPhotosResult> {
  const osId = os.id;

  if (!canUploadInstallationArtifacts(os)) {
    return {
      ok: false,
      message: "OS nao esta na etapa Instalacao para anexar fotos",
    };
  }

  const osAmbienteIdRaw = formData.get("os_ambiente_id");
  const osAmbienteId =
    typeof osAmbienteIdRaw === "string" && osAmbienteIdRaw.trim()
      ? osAmbienteIdRaw.trim()
      : null;

  const ambienteResolved = await resolveInstallationAmbienteId(
    supabase,
    os,
    osAmbienteId,
  );
  if (!ambienteResolved.ok) {
    return { ok: false, message: ambienteResolved.message };
  }

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
      return { ok: false, message: `Arquivo excede 8 MB` };
    }

    const nome = uploadBlobName(file);
    const ext = nome.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${osId}/installation/${crypto.randomUUID()}.${ext}`;
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
      os_ambiente_id: ambienteResolved.id,
      tipo: OS_ANEXO_TIPO_INSTALLATION,
      storage_path: path,
      nome_arquivo: nome,
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

const RECEIPT_MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

function resolveReceiptMime(file: File): string | null {
  const t = file.type?.trim().toLowerCase();
  if (t === "application/pdf" || t.startsWith("image/")) return t;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return RECEIPT_MIME_BY_EXT[ext] ?? null;
}

export type UploadInstallationReceiptResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

export async function uploadInstallationPaymentReceipt(
  supabase: SupabaseClient,
  userId: string,
  os: OsAnexoUploadContext,
  file: File,
): Promise<UploadInstallationReceiptResult> {
  const osId = os.id;

  if (!canUploadInstallationArtifacts(os)) {
    return {
      ok: false,
      message: "OS nao esta na etapa Instalacao para anexar comprovante",
    };
  }

  const contentType = resolveReceiptMime(file);
  if (!contentType) {
    return { ok: false, message: "Use imagem (JPEG, PNG, WebP) ou PDF" };
  }
  if (file.size > MAX_ANEXO_BYTES) {
    return { ok: false, message: "Arquivo excede 8 MB" };
  }

  const { data: antigos } = await supabase
    .from("os_anexos")
    .select("id, storage_path")
    .eq("ordem_servico_id", osId)
    .eq("tipo", OS_ANEXO_TIPO_INSTALLATION_PAYMENT_RECEIPT);

  const ext =
    contentType === "application/pdf"
      ? "pdf"
      : file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${osId}/installation_payment_receipt/${crypto.randomUUID()}.${ext}`;
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
    tipo: OS_ANEXO_TIPO_INSTALLATION_PAYMENT_RECEIPT,
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
