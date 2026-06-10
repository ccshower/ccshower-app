import { DISPLAY_LOCALE } from "@/lib/i18n";
import { agendaEventoStartIso } from "@/lib/ordens-servico/agenda-evento-query";
import {
  OPERATIONAL_TZ,
  zonedWallClockToUtcIso,
} from "@/lib/ordens-servico/datetime";
import {
  parseOsWorkflowStage,
  type OsWorkflowStage,
} from "@/lib/ordens-servico/workflow";
import { hojeOperacionalYmd } from "@/lib/ordens-servico/visita-slots";

/** Tipos de auditoria — não aparecem no calendário operacional de campo. */
export const AGENDA_AUDIT_EVENT_TYPES = new Set([
  "stage_changed",
  "status_changed",
  "os_created",
  "financial_approved",
  "financial_rejected",
  "project_completed",
  "installation_completed",
]);

/** Compromissos encerrados — permanecem no histórico, não no calendário ativo. */
const AGENDA_CALENDAR_INACTIVE_STATUSES = new Set([
  "completed",
  "cancelled",
  "cancelado",
  "concluido",
]);

/**
 * Etapas da OS em que cada tipo de compromisso de campo continua relevante
 * no calendário operacional.
 */
const CALENDAR_FIELD_EVENT_STAGES: Partial<
  Record<string, readonly OsWorkflowStage[]>
> = {
  technical_visit: ["commercial"],
  measurement: ["commercial", "project"],
  installation: ["project", "installation"],
};

export type CalendarEvento = {
  id: string;
  ordem_servico_id: string;
  equipe_id: string | null;
  startIso: string;
  tipo_evento: string;
  status: string;
  cliente_nome: string;
  equipe_nome: string;
  equipe_cor: string;
  equipe_cor_secundaria: string | null;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

export function weekdayOperational(ymd: string): number {
  const iso = zonedWallClockToUtcIso(ymd, "12:00");
  if (!iso) return 0;
  const label = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: OPERATIONAL_TZ,
  }).format(new Date(iso));
  return WEEKDAY_INDEX[label] ?? 0;
}

export function addDaysOperationalYmd(ymd: string, days: number): string {
  const iso = zonedWallClockToUtcIso(ymd, "12:00");
  if (!iso) return ymd;
  const next = new Date(new Date(iso).getTime() + days * 86_400_000);
  return next.toLocaleDateString("en-CA", { timeZone: OPERATIONAL_TZ });
}

/** Segunda-feira da semana operacional que contém `anchorYmd`. */
export function mondayOfOperationalWeek(anchorYmd?: string): string {
  const ymd = anchorYmd ?? hojeOperacionalYmd();
  const offset = weekdayOperational(ymd);
  return addDaysOperationalYmd(ymd, -offset);
}

export function weekBoundsIso(mondayYmd: string): { start: string; end: string } {
  const start = zonedWallClockToUtcIso(mondayYmd, "00:00");
  const end = zonedWallClockToUtcIso(addDaysOperationalYmd(mondayYmd, 7), "00:00");
  if (!start || !end) {
    throw new Error("Intervalo da semana inválido");
  }
  return { start, end };
}

export function weekDayYmds(mondayYmd: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysOperationalYmd(mondayYmd, i));
}

export function formatCalendarDayHeader(ymd: string): string {
  const iso = zonedWallClockToUtcIso(ymd, "12:00");
  if (!iso) return ymd;
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: OPERATIONAL_TZ,
  }).format(new Date(iso));
}

export function formatCalendarWeekRange(mondayYmd: string): string {
  const endYmd = addDaysOperationalYmd(mondayYmd, 6);
  const startIso = zonedWallClockToUtcIso(mondayYmd, "12:00");
  const endIso = zonedWallClockToUtcIso(endYmd, "12:00");
  if (!startIso || !endIso) return mondayYmd;

  const fmt = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: OPERATIONAL_TZ,
  });
  return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`;
}

export function formatCalendarEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: OPERATIONAL_TZ,
  }).format(d);
}

export function formatCalendarRescheduleDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: OPERATIONAL_TZ,
  }).format(d);
}

/** Hora de parede (HH:mm) no fuso operacional — mesma base do drag-and-drop. */
export function operationalWallClockHm(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: OPERATIONAL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h.padStart(2, "0")}:${m}`;
}

/** Reagenda mantendo horário operacional — altera apenas o dia. */
export function rescheduleEventToDay(
  startIso: string,
  targetYmd: string,
): string | null {
  const hm = operationalWallClockHm(startIso);
  if (!hm) return null;
  return zonedWallClockToUtcIso(targetYmd, hm);
}

export const CALENDAR_DRAG_MIME = "application/x-ccshower-calendar-event";

export type CalendarDragPayload = {
  eventId: string;
  sourceYmd: string;
};

export function parseCalendarDragPayload(raw: string): CalendarDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as CalendarDragPayload;
    if (!parsed.eventId || !parsed.sourceYmd) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type CalendarRescheduleDraft = {
  evento: CalendarEvento;
  sourceYmd: string;
  targetYmd: string;
  currentStartIso: string;
  newStartIso: string;
};

export function eventDayYmd(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: OPERATIONAL_TZ });
}

export function isCalendarAgendaEvent(tipo: string): boolean {
  return !AGENDA_AUDIT_EVENT_TYPES.has(tipo);
}

export function isActiveCalendarAgendaStatus(
  status: string | null | undefined,
): boolean {
  return !AGENDA_CALENDAR_INACTIVE_STATUSES.has(status ?? "");
}

/** Compromisso de campo ainda relevante para a etapa atual da OS. */
export function isCalendarEventRelevantForOsStage(
  tipoEvento: string,
  etapaAtual: string | null | undefined,
): boolean {
  const allowed = CALENDAR_FIELD_EVENT_STAGES[tipoEvento];
  if (!allowed) return true;

  const stage = parseOsWorkflowStage(etapaAtual);
  if (!stage) return false;

  return allowed.includes(stage);
}

export function isOperationalCalendarEvent(row: {
  tipo_evento: string;
  status: string;
  ordens_servico?: { etapa_atual: string | null } | null;
}): boolean {
  if (!isCalendarAgendaEvent(row.tipo_evento)) return false;
  if (!isActiveCalendarAgendaStatus(row.status)) return false;
  return isCalendarEventRelevantForOsStage(
    row.tipo_evento,
    row.ordens_servico?.etapa_atual,
  );
}

export function mapRowToCalendarEvento(row: {
  id: string;
  ordem_servico_id: string;
  equipe_id?: string | null;
  tipo_evento: string;
  status: string;
  data_evento?: string | null;
  data_inicio?: string | null;
  hora_evento?: string | null;
  clientes: { nome: string } | null;
  equipes: { nome: string; cor_primaria: string; cor_secundaria?: string } | null;
  ordens_servico?: { etapa_atual: string | null } | null;
}): CalendarEvento | null {
  if (!row.ordem_servico_id) return null;
  if (!isOperationalCalendarEvent(row)) return null;

  const startIso = agendaEventoStartIso(row);
  if (!startIso || Number.isNaN(new Date(startIso).getTime())) return null;

  return {
    id: row.id,
    ordem_servico_id: row.ordem_servico_id,
    equipe_id: row.equipe_id ?? null,
    startIso,
    tipo_evento: row.tipo_evento,
    status: row.status,
    cliente_nome: row.clientes?.nome?.trim() || "—",
    equipe_nome: row.equipes?.nome?.trim() || "—",
    equipe_cor: row.equipes?.cor_primaria?.trim() || "#7189a8",
    equipe_cor_secundaria: row.equipes?.cor_secundaria?.trim() || null,
  };
}

/** Monta URL do calendário preservando vista, data e filtro de equipe. */
export type CalendarViewMode = "day" | "week" | "month";

export const CALENDAR_VIEW_MODES: readonly CalendarViewMode[] = [
  "day",
  "week",
  "month",
] as const;

export function parseCalendarViewMode(
  raw: string | null | undefined,
): CalendarViewMode {
  if (raw === "week" || raw === "month") return raw;
  return "day";
}

export function calendarHref(params: {
  vista?: CalendarViewMode;
  dia?: string;
  semana?: string;
  equipe?: string | null;
}): string {
  const sp = new URLSearchParams();
  const vista = params.vista ?? "day";
  sp.set("vista", vista);
  if (vista === "day" && params.dia) sp.set("dia", params.dia);
  if (vista === "week" && params.semana) sp.set("semana", params.semana);
  if (params.equipe) sp.set("equipe", params.equipe);
  return `/calendar?${sp.toString()}`;
}

export function filterEventosForDay(
  eventos: CalendarEvento[],
  ymd: string,
): CalendarEvento[] {
  return eventos
    .filter((ev) => eventDayYmd(ev.startIso) === ymd)
    .sort(
      (a, b) =>
        new Date(a.startIso).getTime() - new Date(b.startIso).getTime(),
    );
}

export function formatCalendarDayTitle(ymd: string): string {
  const iso = zonedWallClockToUtcIso(ymd, "12:00");
  if (!iso) return ymd;
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: OPERATIONAL_TZ,
  }).format(new Date(iso));
}

export function groupEventsByDay(
  eventos: CalendarEvento[],
  weekDays: string[],
): Map<string, CalendarEvento[]> {
  const map = new Map<string, CalendarEvento[]>(
    weekDays.map((d) => [d, []]),
  );

  for (const ev of eventos) {
    const day = eventDayYmd(ev.startIso);
    if (!day || !map.has(day)) continue;
    map.get(day)!.push(ev);
  }

  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        new Date(a.startIso).getTime() - new Date(b.startIso).getTime(),
    );
  }

  return map;
}

export function isTodayOperational(ymd: string): boolean {
  return ymd === hojeOperacionalYmd();
}

/** Evento cai dentro do intervalo [weekStart, weekEnd) pelo início efetivo. */
export function eventoInWeekRange(
  startIso: string,
  weekStart: string,
  weekEnd: string,
): boolean {
  const ms = new Date(startIso).getTime();
  if (Number.isNaN(ms)) return false;
  return ms >= new Date(weekStart).getTime() && ms < new Date(weekEnd).getTime();
}
