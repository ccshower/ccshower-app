/** Converte entrada de quantidade (form/CSV) em número >= 0. */
export function parseCatalogoQuantidade(
  raw: string | null | undefined,
): number | undefined {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const normalized = s.replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

/** Exibição amigável na lista de estoque. */
export function formatCatalogoQuantidade(value: number | null | undefined): string {
  const n = value ?? 0;
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.001) {
    return String(Math.round(n));
  }
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}
