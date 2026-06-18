import {
  addDaysOperationalYmd,
  isActiveCalendarAgendaStatus,
  mondayOfOperationalWeek,
  operationalWallClockHm,
  weekBoundsIso,
  weekDayYmds,
} from "@/lib/calendar/operational-calendar";
import {
  agendaEventoStartIso,
  AGENDA_EVENTO_DATETIME_COLUMNS,
} from "@/lib/ordens-servico/agenda-evento-query";
import {
  AGENDA_GLOBAL_VAZIO,
  type AgendaGlobalBadgeOperacional,
  type AgendaGlobalData,
  type AgendaGlobalDia,
  type AgendaGlobalEvento,
  type AgendaGlobalResumoContadores,
  type AgendaGlobalSemana,
} from "@/lib/centro-operacional/agenda-global";
import { OPERATIONAL_TZ } from "@/lib/ordens-servico/datetime";
import { hojeOperacionalYmd } from "@/lib/ordens-servico/visita-slots";
import type { AgendaTipo } from "@/lib/mock/centro-operacional/operational-dashboard";
import { createClient } from "@/lib/supabase/server";

const AGENDA_GLOBAL_SELECT = `
  ${AGENDA_EVENTO_DATETIME_COLUMNS},
  ordem_servico_id,
  etapa,
  titulo,
  descricao,
  clientes!cliente_id ( nome, endereco_formatado ),
  equipes!equipe_id ( nome )
`;

const FIELD_EVENT_TYPES = new Set(["technical_visit", "measurement", "installation"]);
const FINANCIAL_EVENT_TYPES = new Set(["financial_approved", "financial_rejected"]);

type AgendaGlobalRow = {
  id: string;
  ordem_servico_id?: string | null;
  tipo_evento: string;
  etapa?: string | null;
  status?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  data_evento?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  hora_evento?: string | null;
  clientes?: { nome?: string | null; endereco_formatado?: string | null } | null;
  equipes?: { nome?: string | null } | null;
};

type ParsedAgendaGlobalEvent = AgendaGlobalEvento & {
  startMs: number;
  dayYmd: string;
};

function isCancelledStatus(status: string | null | undefined): boolean {
  return status === "cancelled" || status === "cancelado";
}

function resolveBadgeOperacional(
  row: AgendaGlobalRow,
  startMs: number,
  nowMs: number,
): AgendaGlobalBadgeOperacional | null {
  const status = row.status ?? "";
  if (status === "cancelled" || status === "cancelado") return "cancelado";

  const etapa = row.etapa ?? "";
  if (etapa === "blocked" || etapa === "bloqueado") return "bloqueado";

  const texto = `${row.descricao ?? ""} ${row.titulo ?? ""}`.toLowerCase();
  if (texto.includes("reagendado")) return "reagendado";

  const aindaPendente =
    status === "scheduled" ||
    status === "confirmed" ||
    status === "agendado" ||
    status === "confirmado";
  if (startMs < nowMs && aindaPendente) return "atrasado";

  return null;
}

function mapTipoLabel(tipo: string, etapa: string | null | undefined): AgendaTipo {
  if (tipo === "technical_visit") return "Technical Visit";
  if (tipo === "installation") return "Installation";
  if (tipo === "measurement") return "Project";
  if (etapa === "project" || etapa === "projeto") return "Project";
  if (etapa === "financial_review" || etapa === "financeiro") return "Financial";
  return "Technical Visit";
}

function eventDayYmd(startIso: string): string | null {
  const d = new Date(startIso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: OPERATIONAL_TZ });
}

function parseAgendaGlobalRow(row: AgendaGlobalRow): ParsedAgendaGlobalEvent | null {
  if (isCancelledStatus(row.status)) return null;

  const ordemServicoId = row.ordem_servico_id?.trim();
  if (!ordemServicoId) return null;

  const startIso = agendaEventoStartIso(row);
  if (!startIso) return null;

  const dayYmd = eventDayYmd(startIso);
  if (!dayYmd) return null;

  const hora = operationalWallClockHm(startIso) ?? "—";
  const cliente = row.clientes?.nome?.trim() || row.titulo?.trim() || "—";
  const equipe = row.equipes?.nome?.trim() || "—";
  const endereco = row.clientes?.endereco_formatado?.trim() || "—";

  return {
    id: row.id,
    ordemServicoId,
    hora,
    tipo: mapTipoLabel(row.tipo_evento, row.etapa),
    cliente,
    equipe,
    endereco,
    temporal: "futuro",
    badgeOperacional: null,
    startMs: new Date(startIso).getTime(),
    dayYmd,
  };
}

function isListableFieldEvent(row: AgendaGlobalRow): boolean {
  return (
    FIELD_EVENT_TYPES.has(row.tipo_evento) &&
    isActiveCalendarAgendaStatus(row.status)
  );
}

function isCountableFieldEvent(row: AgendaGlobalRow): boolean {
  return FIELD_EVENT_TYPES.has(row.tipo_evento) && !isCancelledStatus(row.status);
}

function incrementContador(
  contadores: AgendaGlobalResumoContadores,
  row: AgendaGlobalRow,
): void {
  if (isCancelledStatus(row.status)) return;

  const tipo = row.tipo_evento;
  const etapa = row.etapa ?? "";

  if (FINANCIAL_EVENT_TYPES.has(tipo)) {
    contadores.financeiro += 1;
    return;
  }

  if (!isCountableFieldEvent(row)) return;

  if (tipo === "technical_visit") contadores.visitas += 1;
  else if (tipo === "installation") contadores.instalacoes += 1;
  else if (tipo === "measurement") contadores.projetos += 1;

  if (etapa === "financial_review" || etapa === "financeiro") {
    contadores.financeiro += 1;
  }
}

function buildDiaResumo(
  ymd: string,
  parsed: ParsedAgendaGlobalEvent[],
  rows: AgendaGlobalRow[],
  nowMs: number,
): AgendaGlobalDia {
  const contadores: AgendaGlobalResumoContadores = { ...AGENDA_GLOBAL_VAZIO };

  for (const row of rows) {
    const startIso = agendaEventoStartIso(row);
    if (!startIso) continue;
    if (eventDayYmd(startIso) !== ymd) continue;
    incrementContador(contadores, row);
  }

  const rowById = new Map(rows.map((row) => [row.id, row]));

  const eventos: AgendaGlobalEvento[] = parsed
    .filter((ev) => ev.dayYmd === ymd)
    .sort((a, b) => a.startMs - b.startMs)
    .map(({ startMs, dayYmd: _d, badgeOperacional: _b, ...ev }) => {
      const row = rowById.get(ev.id);
      return {
        ...ev,
        temporal: startMs < nowMs ? "passado" : "futuro",
        badgeOperacional: row
          ? resolveBadgeOperacional(row, startMs, nowMs)
          : null,
      };
    });

  return {
    ymd,
    eventos,
    contadores,
  };
}

function buildSemanaResumo(
  mondayYmd: string,
  parsed: ParsedAgendaGlobalEvent[],
  rows: AgendaGlobalRow[],
  nowMs: number,
): AgendaGlobalSemana {
  const weekDays = new Set(weekDayYmds(mondayYmd));
  const fimYmd = addDaysOperationalYmd(mondayYmd, 6);
  const contadores: AgendaGlobalResumoContadores = { ...AGENDA_GLOBAL_VAZIO };

  for (const row of rows) {
    const startIso = agendaEventoStartIso(row);
    if (!startIso) continue;
    const day = eventDayYmd(startIso);
    if (!day || !weekDays.has(day)) continue;
    incrementContador(contadores, row);
  }

  const rowById = new Map(rows.map((row) => [row.id, row]));

  const eventos: AgendaGlobalEvento[] = parsed
    .filter((ev) => weekDays.has(ev.dayYmd))
    .sort((a, b) => a.startMs - b.startMs)
    .map(({ startMs, dayYmd: _d, badgeOperacional: _b, ...ev }) => {
      const row = rowById.get(ev.id);
      return {
        ...ev,
        temporal: startMs < nowMs ? "passado" : "futuro",
        badgeOperacional: row
          ? resolveBadgeOperacional(row, startMs, nowMs)
          : null,
      };
    });

  return {
    inicioYmd: mondayYmd,
    fimYmd,
    eventos,
    contadores,
  };
}

export async function loadAgendaGlobal(
  unidadeId?: string | null,
): Promise<AgendaGlobalData> {
  const hojeYmd = hojeOperacionalYmd();
  const amanhaYmd = addDaysOperationalYmd(hojeYmd, 1);
  const mondayYmd = mondayOfOperationalWeek(hojeYmd);
  const weekRange = weekBoundsIso(mondayYmd);

  const vazioSemana: AgendaGlobalSemana = {
    inicioYmd: mondayYmd,
    fimYmd: addDaysOperationalYmd(mondayYmd, 6),
    eventos: [],
    contadores: { ...AGENDA_GLOBAL_VAZIO },
  };

  const vazio: AgendaGlobalData = {
    hoje: { ymd: hojeYmd, eventos: [], contadores: { ...AGENDA_GLOBAL_VAZIO } },
    amanha: { ymd: amanhaYmd, eventos: [], contadores: { ...AGENDA_GLOBAL_VAZIO } },
    semana: vazioSemana,
    error: null,
  };

  if (!weekRange.start || !weekRange.end) {
    return { ...vazio, error: "Invalid operational date" };
  }

  const supabase = await createClient();
  let query = supabase
    .from("agenda_eventos")
    .select(AGENDA_GLOBAL_SELECT)
    .or(
      `and(data_inicio.gte.${weekRange.start},data_inicio.lt.${weekRange.end}),and(data_evento.gte.${weekRange.start},data_evento.lt.${weekRange.end})`,
    );
  if (unidadeId) query = query.eq("unidade_id", unidadeId);

  const { data, error } = await query;

  if (error) {
    return { ...vazio, error: error.message };
  }

  const rows = (data ?? []) as AgendaGlobalRow[];
  const parsed = rows
    .filter(isListableFieldEvent)
    .map(parseAgendaGlobalRow)
    .filter((ev): ev is ParsedAgendaGlobalEvent => ev != null);

  const nowMs = Date.now();

  return {
    hoje: buildDiaResumo(hojeYmd, parsed, rows, nowMs),
    amanha: buildDiaResumo(amanhaYmd, parsed, rows, nowMs),
    semana: buildSemanaResumo(mondayYmd, parsed, rows, nowMs),
    error: null,
  };
}
