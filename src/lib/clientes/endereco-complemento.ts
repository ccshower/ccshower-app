/** Insere ou troca o complemento logo depois da rua, sem repetir. */
export function composeEnderecoFormatado(
  formatted: string,
  previousComplement: string,
  nextComplement: string,
): string {
  const prev = previousComplement.trim();
  const next = nextComplement.trim();
  let base = formatted.trim();

  if (prev) {
    const escaped = prev.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    base = base
      .replace(new RegExp(`,\\s*${escaped}(?=,|$)`, "i"), "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+,/g, ",")
      .trim();
  }

  if (!next) return base;
  if (base.toLocaleUpperCase("en-US").includes(next.toLocaleUpperCase("en-US"))) {
    return base;
  }

  const comma = base.indexOf(",");
  if (comma === -1) return `${base}, ${next}`;
  return `${base.slice(0, comma)}, ${next}${base.slice(comma)}`;
}
