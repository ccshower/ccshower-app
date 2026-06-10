export async function uploadCncViaApi(
  osId: string,
  file: File,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const formData = new FormData();
  formData.set("file", file);

  const res = await fetch(`/api/os/${osId}/cnc`, {
    method: "POST",
    body: formData,
  });

  const data = (await res.json()) as
    | { ok: true; id: string }
    | { ok: false; message: string };

  if (!res.ok || !data.ok) {
    return {
      ok: false,
      message: "message" in data ? data.message : "Erro no upload do Desenho Técnico",
    };
  }

  return data;
}
