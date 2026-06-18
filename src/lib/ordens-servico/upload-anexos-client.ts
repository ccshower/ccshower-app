export type UploadAnexosClientResult =
  | { ok: true; uploaded: number; id: string }
  | { ok: false; message: string };

export type UploadReceiptClientResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

/** Upload via Route Handler (multipart) — evita Failed to fetch em Server Actions. */
export async function uploadAnexosVisitaViaApi(
  osId: string,
  files: FileList | File[],
  osAmbienteId?: string | null,
): Promise<UploadAnexosClientResult> {
  const list = Array.from(files);
  if (list.length === 0) {
    return { ok: false, message: "Nenhum arquivo selecionado" };
  }

  const formData = new FormData();
  for (const file of list) {
    formData.append("files", file);
  }
  if (osAmbienteId) {
    formData.append("os_ambiente_id", osAmbienteId);
  }

  let response: Response;
  try {
    response = await fetch(`/api/os/${osId}/anexos`, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });
  } catch {
    return {
      ok: false,
      message:
        "Falha de rede no envio. Verifique conexao ou tamanho das imagens (max 8 MB cada).",
    };
  }

  let payload: UploadAnexosClientResult & { message?: string };
  try {
    payload = (await response.json()) as UploadAnexosClientResult;
  } catch {
    return { ok: false, message: "Resposta invalida do servidor" };
  }

  if (!response.ok) {
    return {
      ok: false,
      message: payload.message ?? `Erro ${response.status} no upload`,
    };
  }

  return payload;
}

export async function uploadComprovantePagamentoViaApi(
  osId: string,
  file: File,
): Promise<UploadReceiptClientResult> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`/api/os/${osId}/payment-receipt`, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });
  } catch {
    return {
      ok: false,
      message: "Falha de rede no envio. Verifique conexão ou tamanho (máx. 8 MB).",
    };
  }

  let payload: UploadReceiptClientResult & { message?: string };
  try {
    payload = (await response.json()) as UploadReceiptClientResult;
  } catch {
    return { ok: false, message: "Resposta inválida do servidor" };
  }

  if (!response.ok) {
    return {
      ok: false,
      message: payload.message ?? `Erro ${response.status} no upload`,
    };
  }

  return payload;
}

export async function uploadFotosInstalacaoViaApi(
  osId: string,
  files: FileList | File[],
): Promise<UploadAnexosClientResult> {
  const list = Array.from(files);
  if (list.length === 0) {
    return { ok: false, message: "Nenhum arquivo selecionado" };
  }

  const formData = new FormData();
  for (const file of list) {
    formData.append("files", file);
  }

  let response: Response;
  try {
    response = await fetch(`/api/os/${osId}/installation-photos`, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });
  } catch {
    return {
      ok: false,
      message:
        "Falha de rede no envio. Verifique conexao ou tamanho das imagens (max 8 MB cada).",
    };
  }

  let payload: UploadAnexosClientResult & { message?: string };
  try {
    payload = (await response.json()) as UploadAnexosClientResult;
  } catch {
    return { ok: false, message: "Resposta invalida do servidor" };
  }

  if (!response.ok) {
    return {
      ok: false,
      message: payload.message ?? `Erro ${response.status} no upload`,
    };
  }

  return payload;
}

export async function uploadComprovanteInstalacaoViaApi(
  osId: string,
  file: File,
): Promise<UploadReceiptClientResult> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`/api/os/${osId}/installation-payment-receipt`, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });
  } catch {
    return {
      ok: false,
      message: "Falha de rede no envio. Verifique conexão ou tamanho (máx. 8 MB).",
    };
  }

  let payload: UploadReceiptClientResult & { message?: string };
  try {
    payload = (await response.json()) as UploadReceiptClientResult;
  } catch {
    return { ok: false, message: "Resposta inválida do servidor" };
  }

  if (!response.ok) {
    return {
      ok: false,
      message: payload.message ?? `Erro ${response.status} no upload`,
    };
  }

  return payload;
}
