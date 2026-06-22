/** Status do pipeline N8N de extração da ficha técnica do PDF. */
export type FichaImportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "skipped";

export type OsFichaTecnicaItem = {
  id: string;
  ordem_servico_id: string;
  os_ambiente_id: string | null;
  os_anexo_id: string;
  section: string;
  sku: string;
  quantity: number;
  glass_spec: string | null;
  finish: string | null;
  notes: string | null;
  sort_order: number;
  catalogo_item_id: string | null;
  qty_reserved: number;
  qty_consumed: number;
  criado_em: string;
  atualizado_em: string;
};

export type FichaTecnicaItemInput = {
  section?: string | null;
  sku: string;
  quantity: number;
  glass_spec?: string | null;
  finish?: string | null;
  notes?: string | null;
  sort_order?: number;
  catalogo_item_id?: string | null;
};

export type FichaTecnicaImportPayload = {
  os_anexo_id: string;
  status: "completed" | "failed";
  items?: FichaTecnicaItemInput[];
  error?: string | null;
};

export function parseFichaTecnicaItemInput(
  raw: FichaTecnicaItemInput,
  index: number,
): { ok: true; value: FichaTecnicaItemInput } | { ok: false; message: string } {
  const sku = raw.sku?.trim().toUpperCase() ?? "";
  if (!sku) {
    return { ok: false, message: `Item ${index + 1}: SKU obrigatorio` };
  }

  const quantity = Number(raw.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, message: `Item ${index + 1}: quantidade invalida` };
  }

  const section = raw.section?.trim() || "SHOWER FITTINGS";
  const glass_spec = raw.glass_spec?.trim() || null;
  const finish = raw.finish?.trim() || null;
  const notes = raw.notes?.trim() || null;
  const sort_order =
    typeof raw.sort_order === "number" && Number.isFinite(raw.sort_order)
      ? raw.sort_order
      : index;

  return {
    ok: true,
    value: {
      section,
      sku,
      quantity: Math.round(quantity * 1000) / 1000,
      glass_spec,
      finish,
      notes,
      sort_order,
      catalogo_item_id: raw.catalogo_item_id?.trim() || null,
    },
  };
}

export function parseFichaTecnicaImportPayload(
  body: unknown,
): { ok: true; value: FichaTecnicaImportPayload } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Payload invalido" };
  }

  const raw = body as Record<string, unknown>;
  const os_anexo_id =
    typeof raw.os_anexo_id === "string" ? raw.os_anexo_id.trim() : "";
  if (!os_anexo_id) {
    return { ok: false, message: "os_anexo_id obrigatorio" };
  }

  const status = raw.status;
  if (status !== "completed" && status !== "failed") {
    return { ok: false, message: "status deve ser completed ou failed" };
  }

  if (status === "failed") {
    const error =
      typeof raw.error === "string" && raw.error.trim()
        ? raw.error.trim()
        : "Falha na extracao da ficha tecnica";
    return {
      ok: true,
      value: { os_anexo_id, status, error },
    };
  }

  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    return { ok: false, message: "items obrigatorio quando status=completed" };
  }

  const items: FichaTecnicaItemInput[] = [];
  for (let i = 0; i < raw.items.length; i++) {
    const parsed = parseFichaTecnicaItemInput(
      raw.items[i] as FichaTecnicaItemInput,
      i,
    );
    if (!parsed.ok) return parsed;
    items.push(parsed.value);
  }

  return {
    ok: true,
    value: { os_anexo_id, status, items },
  };
}

export type FichaTecnicaWebhookPayload = {
  event: "cnc_pdf_uploaded";
  os_id: string;
  os_anexo_id: string;
  os_ambiente_id: string | null;
  empresa_id: string;
  storage_path: string;
  signed_url: string | null;
  mime_type: string;
  nome_arquivo: string;
  callback_path: string;
};

export function resolveFichaTecnicaCallbackPath(): string {
  return "/api/webhooks/n8n/ficha-tecnica";
}

export function resolveAppBaseUrl(): string | null {
  const explicit =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return explicit || null;
}

export function resolveFichaTecnicaCallbackUrl(): string | null {
  const base = resolveAppBaseUrl();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}${resolveFichaTecnicaCallbackPath()}`;
}
