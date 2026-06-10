import type { CentroIconId } from "@/components/admin/centro-operacional/centro-operacional-icons";

export type SaudeOperacionalStatus = "ok" | "atencao" | "critico";

/** Card da seção Saúde Operacional — mesmo shape do layout existente. */
export type SaudeOperacionalCard = {
  label: string;
  value: number;
  total?: number;
  hint: string;
  status: SaudeOperacionalStatus;
  icon: CentroIconId;
};

export type SaudeOperacionalData = {
  cards: SaudeOperacionalCard[];
  error: string | null;
};

/**
 * Limites operacionais para status visual (Normal / Atenção / Crítico).
 * Ajustar conforme capacidade real da operação.
 */
export const SAUDE_OS_EM_ANDAMENTO = {
  atencao: 35,
  critico: 55,
} as const;

export const SAUDE_FINANCEIROS_PENDENTES = {
  atencao: 4,
  critico: 8,
  diasGargalo: 2,
} as const;

export const SAUDE_PROJETOS_PENDENTES = {
  atencao: 6,
  critico: 12,
} as const;

/** Fração de instalações ainda só agendadas (sem confirmação). */
export const SAUDE_INSTALACOES_SEMANA = {
  atencaoPendingMin: 1,
  criticoPendingMin: 4,
  criticoPendingRatio: 0.45,
} as const;

export function resolveSaudeStatusByCount(
  value: number,
  limits: { atencao: number; critico: number },
): SaudeOperacionalStatus {
  if (value >= limits.critico) return "critico";
  if (value >= limits.atencao) return "atencao";
  return "ok";
}
