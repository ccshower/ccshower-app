/** Converte cor hex da equipe (#RRGGBB) para rgba — sem cores fixas no app. */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) {
    return `rgba(107, 120, 152, ${alpha})`;
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) {
    return `rgba(107, 120, 152, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function equipeBadgeStyles(corPrimaria: string) {
  return {
    backgroundColor: hexToRgba(corPrimaria, 0.14),
    color: corPrimaria,
    borderColor: hexToRgba(corPrimaria, 0.35),
  } as const;
}

/** Opacidade do tint de fundo em cards (calendário e operação) — ~5%, card predominantemente branco. */
export const EQUIPE_CARD_TINT_ALPHA = 0.05;

/** Tint leve a partir da cor secundária; fallback na primária (mesma intensidade do calendário). */
export function equipeCardTint(
  corPrimaria: string,
  corSecundaria?: string | null,
  alpha: number = EQUIPE_CARD_TINT_ALPHA,
): string {
  const source = corSecundaria?.trim() || corPrimaria?.trim() || "#7189a8";
  return hexToRgba(source, alpha);
}

/** @deprecated Preferir {@link equipeCardTint}. Mantido para compatibilidade. */
export function equipeCalendarCardBackground(corPrimaria: string): string {
  return equipeCardTint(corPrimaria, null);
}

/** Superfície de card operacional/calendário: borda esquerda (primária) + fundo branco com tint. */
export function equipeCardSurfaceStyles(
  corPrimaria: string,
  corSecundaria?: string | null,
  tintAlpha: number = EQUIPE_CARD_TINT_ALPHA,
) {
  const primary = corPrimaria?.trim() || "#7189a8";
  const tint = equipeCardTint(primary, corSecundaria, tintAlpha);
  return {
    borderLeftWidth: 4,
    borderLeftColor: primary,
    backgroundColor: "#ffffff",
    backgroundImage: `linear-gradient(${tint}, ${tint})`,
  } as const;
}
