export type GargaloOperacionalId =
  | "comercial"
  | "financeiro"
  | "projeto"
  | "material";

/** Card de gargalo exibido abaixo da lista Atenção Agora. */
export type GargaloOperacionalItem = {
  id: GargaloOperacionalId;
  etapa: string;
  descricao: string;
  impacto: string;
};

export type GargalosOperacionaisData = {
  items: GargaloOperacionalItem[];
  error: string | null;
};

export const GARGALOS_OPERACIONAIS_VAZIO: GargalosOperacionaisData = {
  items: [],
  error: null,
};

/**
 * Limiares de acúmulo por etapa — gargalo só aparece quando dispara.
 * Dias do financeiro seguem SAUDE_FINANCEIROS_PENDENTES.diasGargalo
 * (mesma régua do hint da Saúde Operacional).
 */
export const GARGALO_LIMIARES = {
  /** OS na fila comercial (sem 1ª visita). */
  comercialFilaMin: 5,
  /** OS em financial_review pendentes há diasGargalo+. */
  financeiroPendentesMin: 3,
  /** OS na fila Projeto (pendente ou em andamento). */
  projetoPendentesMin: 5,
  /** Crashes ativos de material. */
  materialCrashesMin: 2,
} as const;
