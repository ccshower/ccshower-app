import type {
  BloqueioCategoria,
  EtapaFluxo,
} from "@/lib/mock/centro-operacional/operational-dashboard";
import { OPERATIONAL_TZ } from "@/lib/ordens-servico/datetime";

/** Item da lista “Crash ativos no fluxo”. */
export type BloqueioOperacionalItem = {
  id: string;
  osId: string;
  href: string;
  cliente: string;
  os: string;
  etapa: EtapaFluxo;
  /** Categoria registrada em `os_crashes.categoria`. */
  categoria: string;
  /** Bucket usado pelos filtros do dashboard. */
  filterCategoria: BloqueioCategoria;
  motivo: string;
  aberto: string;
  dias: number;
  resp: string;
  semResponsavel: boolean;
  criadoEm: string;
  impactoOperacional: number;
};

export type BloqueioOperacionalFilter = {
  id: BloqueioCategoria | "todos";
  label: string;
  count: number;
};

export type BloqueiosOperacionaisData = {
  items: BloqueioOperacionalItem[];
  totalCount: number;
  filters: BloqueioOperacionalFilter[];
  error: string | null;
};

export const BLOQUEIO_SEM_RESPONSAVEL_LABEL = "NO ASSIGNEE";

export const BLOQUEIO_FILTER_LABELS: Record<BloqueioCategoria, string> = {
  Client: "Client",
  Financial: "Financial",
  Project: "Project",
  Material: "Material",
  Installation: "Installation",
};

const FILTER_ORDER: BloqueioCategoria[] = [
  "Client",
  "Financial",
  "Project",
  "Material",
  "Installation",
];

/**
 * Impacto operacional por etapa do crash (maior = bloqueia mais o fluxo).
 * Instalação e Projeto param execução em campo; Comercial/Financeiro retêm upstream.
 */
export const BLOQUEIO_ETAPA_IMPACTO: Record<string, number> = {
  installation: 40,
  project: 30,
  financial_review: 20,
  commercial: 10,
  blocked: 25,
};

/**
 * Ordenação da lista (documentada):
 * 1. Crash mais antigo — `criado_em` ascendente (prioriza bloqueios abertos há mais tempo).
 * 2. Maior impacto operacional — peso da etapa (`BLOQUEIO_ETAPA_IMPACTO`, descendente).
 * 3. Mais recente — `criado_em` descendente como desempate entre itens equivalentes.
 */
export function compareBloqueiosOperacionais(
  a: Pick<BloqueioOperacionalItem, "criadoEm" | "impactoOperacional">,
  b: Pick<BloqueioOperacionalItem, "criadoEm" | "impactoOperacional">,
): number {
  const ta = new Date(a.criadoEm).getTime();
  const tb = new Date(b.criadoEm).getTime();
  if (ta !== tb) return ta - tb;
  if (a.impactoOperacional !== b.impactoOperacional) {
    return b.impactoOperacional - a.impactoOperacional;
  }
  return tb - ta;
}

export function resolveBloqueioFilterCategoria(
  categoria: string,
  etapa: string,
): BloqueioCategoria {
  const c = categoria.trim();
  if (c === "Cliente" || c === "Client") return "Client";
  if (c === "Financeiro" || c === "Financiamento" || c === "Financial") return "Financial";
  if (c === "Projeto" || c === "Project") return "Project";
  if (c === "Material") return "Material";
  if (c === "Instalação" || c === "Installation" || c === "Local" || etapa === "installation") {
    return "Installation";
  }
  if (etapa === "project") return "Project";
  if (etapa === "financial_review" || etapa === "blocked") return "Financial";
  if (etapa === "commercial") return "Client";
  return "Material";
}

export function resolveBloqueioImpacto(etapa: string): number {
  return BLOQUEIO_ETAPA_IMPACTO[etapa] ?? 5;
}

export function buildBloqueioFilters(
  items: Pick<BloqueioOperacionalItem, "filterCategoria">[],
): BloqueioOperacionalFilter[] {
  return [
    { id: "todos", label: "All", count: items.length },
    ...FILTER_ORDER.map((id) => ({
      id,
      label: BLOQUEIO_FILTER_LABELS[id],
      count: items.filter((i) => i.filterCategoria === id).length,
    })),
  ];
}

function startOfOperationalDayMs(iso: string): number {
  const ymd = new Date(iso).toLocaleDateString("en-CA", {
    timeZone: OPERATIONAL_TZ,
  });
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function diasDesdeCrash(iso: string, nowMs: number): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  const dayStart = startOfOperationalDayMs(iso);
  const todayStart = startOfOperationalDayMs(new Date(nowMs).toISOString());
  return Math.max(0, Math.floor((todayStart - dayStart) / 86_400_000));
}

export function formatCrashAbertoEm(iso: string, nowMs: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const dias = diasDesdeCrash(iso, nowMs);
  const hora = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: OPERATIONAL_TZ,
  }).format(date);

  if (dias <= 0) return `Today, ${hora}`;
  if (dias === 1) return `Yesterday, ${hora}`;
  if (dias === 2) return "2 days ago";
  if (dias < 7) return `${dias} days ago`;

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: OPERATIONAL_TZ,
  }).format(date);
}
