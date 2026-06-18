import { OS_ANEXO_TIPO_CNC } from "@/lib/ordens-servico/separation-list";
import {
  loadOsAnexoUploadContext,
  MAX_ANEXO_BYTES,
  type OsAnexoUploadContext,
} from "@/lib/ordens-servico/os-anexo-upload";
import { OS_ANEXOS_BUCKET } from "@/lib/ordens-servico/visita-comercial";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import type { SupabaseClient } from "@supabase/supabase-js";

export { OS_ANEXO_TIPO_CNC };

const CNC_MIME_BY_EXT: Record<string, string> = {
  nc: "text/plain",
  txt: "text/plain",
  tap: "text/plain",
  gcode: "text/plain",
  pdf: "application/pdf",
  dxf: "application/octet-stream",
  dwg: "application/octet-stream",
};

export function canUploadCncProject(os: { etapa_atual: string; status: string }): boolean {
  if (parseOsStage(os.etapa_atual) !== "project") return false;
  if (os.status === "completed" || os.status === "cancelled") return false;
  return true;
}

export function resolveCncMimeType(file: File): string {
  const t = file.type?.trim().toLowerCase();
  if (t && (t.startsWith("text/") || t === "application/pdf" || t === "application/octet-stream")) {
    return t;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return CNC_MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function cncFilesFromFormData(formData: FormData): File[] {
  const fromList = formData
    .getAll("file")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (fromList.length) return fromList;

  const single = formData.get("file");
  if (single instanceof File && single.size) return [single];
  return [];
}

async function uploadSingleCncFile(
  supabase: SupabaseClient,
  userId: string,
  os: OsAnexoUploadContext,
  file: File,
  index: number,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (file.size > MAX_ANEXO_BYTES) {
    return { ok: false, message: `${file.name}: file exceeds 8 MB` };
  }

  const mime = resolveCncMimeType(file);
  const safeName = file.name.replace(/[^\w.\-()+ ]/g, "_").slice(0, 180);
  const storagePath = `${os.empresa_id}/${os.id}/cnc/${Date.now()}-${index}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(OS_ANEXOS_BUCKET)
    .upload(storagePath, file, { contentType: mime, upsert: false });

  if (upErr) return { ok: false, message: upErr.message };

  const { error: insErr } = await supabase.from("os_anexos").insert({
    ordem_servico_id: os.id,
    empresa_id: os.empresa_id,
    tipo: OS_ANEXO_TIPO_CNC,
    storage_path: storagePath,
    nome_arquivo: file.name,
    mime_type: mime,
    tamanho_bytes: file.size,
    criado_por: userId,
  });

  if (insErr) {
    await supabase.storage.from(OS_ANEXOS_BUCKET).remove([storagePath]);
    return { ok: false, message: insErr.message };
  }

  return { ok: true, id: os.id };
}

export async function uploadCncFileFromFormData(
  supabase: SupabaseClient,
  userId: string,
  os: OsAnexoUploadContext,
  formData: FormData,
): Promise<{ ok: true; id: string; count: number } | { ok: false; message: string }> {
  if (!canUploadCncProject(os)) {
    return { ok: false, message: "Upload de Desenho Técnico permitido apenas na etapa Projeto" };
  }

  const files = cncFilesFromFormData(formData);
  if (!files.length) {
    return { ok: false, message: "Selecione um arquivo de Desenho Técnico" };
  }

  let uploaded = 0;
  for (let i = 0; i < files.length; i++) {
    const result = await uploadSingleCncFile(supabase, userId, os, files[i]!, i);
    if (!result.ok) {
      return {
        ok: false,
        message:
          uploaded > 0
            ? `${result.message} (${uploaded} of ${files.length} uploaded)`
            : result.message,
      };
    }
    uploaded += 1;
  }

  return { ok: true, id: os.id, count: uploaded };
}

export async function loadCncUploadContext(
  supabase: SupabaseClient,
  osId: string,
) {
  return loadOsAnexoUploadContext(supabase, osId);
}
