import {
  isActiveCalendarAgendaStatus,
  mondayOfOperationalWeek,
  weekBoundsIso,
} from "@/lib/calendar/operational-calendar";
import {
  agendaEventoStartIso,
  AGENDA_EVENTO_DATETIME_COLUMNS,
} from "@/lib/ordens-servico/agenda-evento-query";
import { parseFinancialDecision } from "@/lib/ordens-servico/financial-workspace";
import { isOsNaFilaProjeto } from "@/lib/ordens-servico/fila-projeto-query";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import { createClient } from "@/lib/supabase/server";

import {
  resolveSaudeStatusByCount,
  SAUDE_FINANCEIROS_PENDENTES,
  SAUDE_INSTALACOES_SEMANA,
  SAUDE_OS_EM_ANDAMENTO,
  SAUDE_PROJETOS_PENDENTES,
  type SaudeOperacionalCard,
  type SaudeOperacionalData,
} from "./saude-operacional";

const OS_OPEN_STATUSES = new Set(["open", "scheduled", "in_progress"]);

type OsRow = {
  id: string;
  status: string;
  etapa_atual: string | null;
  status_atual: string | null;
  financial_decision: string | null;
  atualizado_em: string;
};

type AgendaInstRow = {
  status?: string | null;
  data_inicio?: string | null;
  data_evento?: string | null;
  hora_evento?: string | null;
};

function isOsAtiva(row: OsRow): boolean {
  return OS_OPEN_STATUSES.has(row.status);
}

function isOsEmAndamento(row: OsRow): boolean {
  return isOsAtiva(row);
}

function isFinanceiroPendente(row: OsRow): boolean {
  if (!isOsAtiva(row)) return false;
  const etapa = parseOsStage(row.etapa_atual);
  if (etapa === "blocked") return true;
  if (etapa !== "financial_review") return false;
  return parseFinancialDecision(row.financial_decision) === "pending";
}

function isProjetoNaFila(row: OsRow): boolean {
  if (!isOsAtiva(row)) return false;
  return isOsNaFilaProjeto(row);
}

function diasDesde(iso: string, nowMs: number): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((nowMs - t) / 86_400_000);
}

function eventoNaSemana(startIso: string, weekStart: number, weekEnd: number): boolean {
  const t = new Date(startIso).getTime();
  return t >= weekStart && t < weekEnd;
}

function isInstalacaoConfirmada(status: string | null | undefined): boolean {
  return status === "confirmed" || status === "confirmado" || status === "on_site" || status === "em_campo";
}

function resolveGargaloFinanceiro(rows: OsRow[], nowMs: number): string {
  const limiteDias = SAUDE_FINANCEIROS_PENDENTES.diasGargalo;
  const stale = rows.filter(
    (r) => isFinanceiroPendente(r) && diasDesde(r.atualizado_em, nowMs) >= limiteDias,
  ).length;
  if (stale > 0) {
    return `${stale} waiting for +${limiteDias} days`;
  }
  const blocked = rows.filter(
    (r) => isOsAtiva(r) && parseOsStage(r.etapa_atual) === "blocked",
  ).length;
  if (blocked > 0) {
    return `${blocked} with blocked flow`;
  }
  return "Within operational deadline";
}

const PROJECT_GARGALO_LABEL: Record<string, string> = {
  project_pending: "Queue awaiting project",
  project_in_progress: "Projects in progress",
  installation_scheduled: "Awaiting installation",
};

function resolveGargaloProjeto(rows: OsRow[]): string {
  const projectRows = rows.filter(
    (r) => isOsAtiva(r) && parseOsStage(r.etapa_atual) === "project",
  );
  if (projectRows.length === 0) return "No pending projects";

  const counts = new Map<string, number>();
  for (const row of projectRows) {
    const key = row.status_atual ?? "project_pending";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let topKey = "project_pending";
  let topCount = 0;
  for (const [key, count] of counts) {
    if (count > topCount) {
      topKey = key;
      topCount = count;
    }
  }

  return PROJECT_GARGALO_LABEL[topKey] ?? "Approval queue";
}

function resolveStatusInstalacoesSemana(
  confirmadas: number,
  total: number,
  pendentesConfirmacao: number,
): SaudeOperacionalCard["status"] {
  if (total === 0) return "ok";
  if (
    pendentesConfirmacao >= SAUDE_INSTALACOES_SEMANA.criticoPendingMin ||
    pendentesConfirmacao / total >= SAUDE_INSTALACOES_SEMANA.criticoPendingRatio
  ) {
    return "critico";
  }
  if (pendentesConfirmacao >= SAUDE_INSTALACOES_SEMANA.atencaoPendingMin) {
    return "atencao";
  }
  return "ok";
}

function buildCards(
  osRows: OsRow[],
  instalacoesSemana: AgendaInstRow[],
  nowMs: number,
): SaudeOperacionalCard[] {
  const osEmAndamento = osRows.filter(isOsEmAndamento).length;
  const financeiros = osRows.filter(isFinanceiroPendente);
  const projetosPendentes = osRows.filter(isProjetoNaFila).length;

  const monday = mondayOfOperationalWeek();
  const { start, end } = weekBoundsIso(monday);
  const weekStart = new Date(start).getTime();
  const weekEnd = new Date(end).getTime();

  const instalacoesAtivas = instalacoesSemana.filter((ev) => {
    if (!isActiveCalendarAgendaStatus(ev.status)) return false;
    const startIso = agendaEventoStartIso(ev);
    if (!startIso) return false;
    return eventoNaSemana(startIso, weekStart, weekEnd);
  });

  const totalInstalacoes = instalacoesAtivas.length;
  const confirmadas = instalacoesAtivas.filter((ev) =>
    isInstalacaoConfirmada(ev.status),
  ).length;
  const pendentesConfirmacao = totalInstalacoes - confirmadas;

  return [
    {
      label: "OS In Progress",
      value: osEmAndamento,
      hint: "in operational flow",
      status: resolveSaudeStatusByCount(osEmAndamento, SAUDE_OS_EM_ANDAMENTO),
      icon: "clipboard",
    },
    {
      label: "Installations This Week",
      value: confirmadas,
      total: totalInstalacoes,
      hint:
        totalInstalacoes === 0
          ? "None scheduled this week"
          : pendentesConfirmacao > 0
            ? `${pendentesConfirmacao} pending confirmation`
            : "All confirmed",
      status: resolveStatusInstalacoesSemana(
        confirmadas,
        totalInstalacoes,
        pendentesConfirmacao,
      ),
      icon: "wrench",
    },
    {
      label: "Pending Financial",
      value: financeiros.length,
      hint: resolveGargaloFinanceiro(osRows, nowMs),
      status: resolveSaudeStatusByCount(
        financeiros.length,
        SAUDE_FINANCEIROS_PENDENTES,
      ),
      icon: "dollar",
    },
    {
      label: "Pending Projects",
      value: projetosPendentes,
      hint: resolveGargaloProjeto(osRows),
      status: resolveSaudeStatusByCount(
        projetosPendentes,
        SAUDE_PROJETOS_PENDENTES,
      ),
      icon: "pen",
    },
  ];
}

const EMPTY_CARDS: SaudeOperacionalCard[] = [
  {
    label: "OS In Progress",
    value: 0,
    hint: "in operational flow",
    status: "ok",
    icon: "clipboard",
  },
  {
    label: "Installations This Week",
    value: 0,
    total: 0,
    hint: "All confirmed",
    status: "ok",
    icon: "wrench",
  },
  {
    label: "Pending Financial",
    value: 0,
    hint: "Within operational deadline",
    status: "ok",
    icon: "dollar",
  },
  {
    label: "Pending Projects",
    value: 0,
    hint: "No pending projects",
    status: "ok",
    icon: "pen",
  },
];

export async function loadSaudeOperacional(
  unidadeId?: string | null,
): Promise<SaudeOperacionalData> {
  const nowMs = Date.now();
  const monday = mondayOfOperationalWeek();
  const { start, end } = weekBoundsIso(monday);

  const supabase = await createClient();

  let osQuery = supabase
    .from("ordens_servico")
    .select(
      "id, status, etapa_atual, status_atual, financial_decision, atualizado_em",
    )
    .eq("ativo", true);
  if (unidadeId) osQuery = osQuery.eq("unidade_id", unidadeId);

  let agendaQuery = supabase
    .from("agenda_eventos")
    .select(`${AGENDA_EVENTO_DATETIME_COLUMNS}`)
    .eq("tipo_evento", "installation")
    .or(
      `and(data_inicio.gte.${start},data_inicio.lt.${end}),and(data_evento.gte.${start},data_evento.lt.${end})`,
    );
  if (unidadeId) agendaQuery = agendaQuery.eq("unidade_id", unidadeId);

  const [osRes, agendaRes] = await Promise.all([osQuery, agendaQuery]);

  const error = osRes.error?.message ?? agendaRes.error?.message ?? null;
  if (error) {
    return { cards: EMPTY_CARDS, error };
  }

  const osRows = (osRes.data ?? []) as OsRow[];
  const instalacoes = (agendaRes.data ?? []) as AgendaInstRow[];

  return {
    cards: buildCards(osRows, instalacoes, nowMs),
    error: null,
  };
}
