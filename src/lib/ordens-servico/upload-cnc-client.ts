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

  let res: Response;
  try {
    res = await fetch(`/api/os/${osId}/cnc`, {
      method: "POST",
      body: formData,
    });
  } catch {
    return { ok: false, message: "Erro de rede no upload do Desenho Técnico" };
  }

  let data: { ok: true; id: string; count?: number } | { ok: false; message: string };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return {
      ok: false,
      message: res.ok
        ? "Resposta inválida do servidor no upload do Desenho Técnico"
        : `Erro no upload do Desenho Técnico (${res.status})`,
    };
  }

  if (!res.ok || !data.ok) {
    return {
      ok: false,
      message: "message" in data ? data.message : "Erro no upload do Desenho Técnico",
    };
  }

  return data;
}
