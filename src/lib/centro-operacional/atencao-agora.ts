import type {
  AttentionItem,
  AttentionType,
  EtapaFluxo,
  Priority,
} from "@/lib/mock/centro-operacional/operational-dashboard";

/** Item do radar operacional — compatível com `AttentionRow`. */
export type AtencaoAgoraItem = AttentionItem & {
  osId: string | null;
  eventoId: string | null;
  href: string;
};

export type AtencaoAgoraFilter = {
  id: AttentionType | "todos";
  label: string;
  count: number;
};

export type AtencaoAgoraData = {
  items: AtencaoAgoraItem[];
  totalCount: number;
  filters: AtencaoAgoraFilter[];
  error: string | null;
};

export const ATENCAO_AGORA_LIMITE = 5;

/**
 * Dias parados na mesma situação operacional antes de exigir ação do gestor.
 * Alinhado ao gargalo financeiro em `saude-operacional.ts`.
 */
export const ATENCAO_OS_DIAS_PARADO: Partial<
  Record<
    | "no_visit"
    | "commercial_pending"
    | "financial_pending"
    | "financial_blocked"
    | "project_pending"
    | "project_in_progress"
    | "installation_pending"
    | "installation_scheduled",
    number
  >
> = {
  no_visit: 2,
  commercial_pending: 3,
  financial_pending: 2,
  financial_blocked: 1,
  project_pending: 3,
  project_in_progress: 3,
  installation_pending: 3,
  installation_scheduled: 2,
};

/** Visita futura sem confirmação — janela em horas. */
export const ATENCAO_VISITA_NAO_CONFIRMADA_HORAS = 48;

export type AtencaoSortMeta = {
  sortGroup: 1 | 2 | 3;
  sortDias: number;
  priority: Priority;
};

export function buildAtencaoFilters(
  all: Pick<AtencaoAgoraItem, "type">[],
): AtencaoAgoraFilter[] {
  return [
    { id: "todos", label: "All", count: all.length },
    {
      id: "bloqueio",
      label: "Blocks",
      count: all.filter((i) => i.type === "bloqueio").length,
    },
    {
      id: "atrasada",
      label: "Overdue",
      count: all.filter((i) => i.type === "atrasada").length,
    },
    {
      id: "critica",
      label: "Pending items",
      count: all.filter((i) => i.type === "critica").length,
    },
    {
      id: "gargalo",
      label: "Bottlenecks",
      count: all.filter((i) => i.type === "gargalo").length,
    },
  ];
}

export function compareAtencaoItems(
  a: AtencaoSortMeta,
  b: AtencaoSortMeta,
): number {
  if (a.sortGroup !== b.sortGroup) return a.sortGroup - b.sortGroup;
  const prioRank: Record<Priority, number> = {
    critico: 0,
    urgente: 1,
    normal: 2,
  };
  const pd = prioRank[a.priority] - prioRank[b.priority];
  if (pd !== 0) return pd;
  return b.sortDias - a.sortDias;
}

export function mapEtapaFluxoLabel(etapa: string | null | undefined): EtapaFluxo {
  switch (etapa) {
    case "commercial":
      return "Commercial";
    case "financial_review":
    case "blocked":
      return "Financial";
    case "project":
      return "Project";
    case "installation":
      return "Installation";
    default:
      return "Commercial";
  }
}

export function formatOsRef(osId: string): string {
  return `OS #${osId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

export function formatAbertoHa(dias: number): string {
  if (dias <= 0) return "Opened today";
  if (dias === 1) return "Open for 1 day";
  return `Open for ${dias} days`;
}

export function formatParadoHa(dias: number): string {
  if (dias <= 0) return "Today";
  if (dias === 1) return "1 day";
  return `${dias} days`;
}
