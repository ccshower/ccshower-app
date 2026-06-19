export async function uploadCncViaApi(
  osId: string,
  files: File | File[],
  osAmbienteId?: string | null,
): Promise<{ ok: true; id: string; count?: number } | { ok: false; message: string }> {
  const list = Array.isArray(files) ? files : [files];
  if (!list.length) {
    return { ok: false, message: "Selecione um arquivo de Desenho Técnico" };
  }

  const formData = new FormData();
  for (const file of list) {
    formData.append("file", file);
  }
  if (osAmbienteId) {
    formData.append("os_ambiente_id", osAmbienteId);
  }

  const res = await fetch(`/api/os/${osId}/cnc`, {
    method: "POST",
    body: formData,
  });

  const data = (await res.json()) as
    | { ok: true; id: string; count?: number }
    | { ok: false; message: string };

  if (!res.ok || !data.ok) {
    return {
      ok: false,
      message: "message" in data ? data.message : "Erro no upload do Desenho Técnico",
    };
  }

  return data;
}
