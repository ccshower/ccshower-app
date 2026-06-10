/** Anexo CNC na etapa Projeto. */
export const OS_ANEXO_TIPO_CNC = "cnc_file";

export type SeparationListItemInput = {
  id?: string;
  item_id: string;
  quantity: number;
  notes?: string | null;
};

export function parseSeparationListItemInput(
  raw: SeparationListItemInput,
): { ok: true; value: SeparationListItemInput } | { ok: false; message: string } {
  const item_id = raw.item_id.trim();
  if (!item_id) {
    return { ok: false, message: "Selecione um item do catálogo" };
  }

  const quantity = Number(raw.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, message: "Quantidade deve ser maior que zero" };
  }

  const notes = raw.notes?.trim() ? raw.notes.trim() : null;

  return {
    ok: true,
    value: {
      id: raw.id,
      item_id,
      quantity: Math.round(quantity * 1000) / 1000,
      notes,
    },
  };
}
