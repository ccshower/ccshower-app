export type CapacidadeStatus = "saudavel" | "atencao" | "sobrecarregado";

export interface CapacidadeMetrica {
  label: string;
  value: number;
}

export interface EquipeCapacidadeDetalhe {
  ocupacaoPercentual: number;
  metricas: CapacidadeMetrica[];
  sugestao?: string;
}

export interface EquipeCapacidade {
  id: string;
  departamento: string;
  nome: string;
  corPrimaria: string;
  status: CapacidadeStatus;
  detalhe: EquipeCapacidadeDetalhe;
}

export interface CapacidadeDepartamento {
  departamento: string;
  equipes: EquipeCapacidade[];
}

export type CapacidadeOperacionalData = {
  departamentos: CapacidadeDepartamento[];
  error: string | null;
};

export const CAPACIDADE_OPERACIONAL_VAZIO: CapacidadeOperacionalData = {
  departamentos: [],
  error: null,
};

/** Capacidade semanal estimada por tipo de equipe (5 dias úteis). */
export const CAPACIDADE_SEMANAL_POR_CODIGO: Record<string, number> = {
  commercial: 40,
  installation: 10,
  project: 15,
};

export const CAPACIDADE_DEPARTAMENTO_LABEL: Record<string, string> = {
  commercial: "Commercial",
  installation: "Installation",
  project: "Project",
};

export const CAPACIDADE_DEPARTAMENTO_ORDER = [
  "commercial",
  "installation",
  "project",
] as const;

export const CAPACIDADE_EVENTOS_POR_CODIGO: Record<string, readonly string[]> = {
  commercial: ["technical_visit"],
  installation: ["installation"],
  project: ["measurement"],
};

export const CAPACIDADE_METRICA_AGENDADOS: Record<string, string> = {
  commercial: "scheduled visits",
  installation: "scheduled installations",
  project: "scheduled measurements",
};

export const CAPACIDADE_STATUS_LIMITS = {
  atencaoMin: 70,
  sobrecarregadoMin: 90,
} as const;

export const capacidadeStatusConfig: Record<
  CapacidadeStatus,
  { label: string; dot: string; bar: string; text: string }
> = {
  saudavel: {
    label: "Healthy",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
  },
  atencao: {
    label: "Attention",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    text: "text-amber-700",
  },
  sobrecarregado: {
    label: "Overloaded",
    dot: "bg-cc-rose-deep",
    bar: "bg-cc-rose-deep",
    text: "text-cc-rose-deep",
  },
};

export function resolveCapacidadeStatus(
  ocupacaoPercentual: number,
): CapacidadeStatus {
  if (ocupacaoPercentual >= CAPACIDADE_STATUS_LIMITS.sobrecarregadoMin) {
    return "sobrecarregado";
  }
  if (ocupacaoPercentual >= CAPACIDADE_STATUS_LIMITS.atencaoMin) {
    return "atencao";
  }
  return "saudavel";
}

export function calcOcupacaoPercentual(
  eventosAgendados: number,
  capacidadeSemanal: number,
): number {
  if (capacidadeSemanal <= 0) return 0;
  return Math.min(100, Math.round((eventosAgendados / capacidadeSemanal) * 100));
}
