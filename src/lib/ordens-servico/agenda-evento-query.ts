import { OPERATIONAL_TZ, zonedWallClockToUtcIso } from "@/lib/ordens-servico/datetime";
import { VISITA_DURACAO_MINUTOS } from "@/lib/ordens-servico/visita-slots";

export type AgendaEventoDatetimeFields = {
  data_evento?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  hora_evento?: string | null;
};

/** Colunas mínimas para resolver início/fim efetivo (consultas operacionais). */
export const AGENDA_EVENTO_DATETIME_COLUMNS =
  "id, data_inicio, data_fim, data_evento, hora_evento, status, tipo_evento";

/** Select de visita técnica por OS (listagens operacionais). */
export const AGENDA_EVENTO_VISITA_OS_SELECT = `${AGENDA_EVENTO_DATETIME_COLUMNS}, ordem_servico_id`;

/** Início efetivo — data_inicio é a fonte oficial; fallback data_evento + hora_evento. */
export function agendaEventoStartIso(
  evento: AgendaEventoDatetimeFields,
): string | null {
  if (evento.data_inicio) {
    const d = new Date(evento.data_inicio);
    if (!Number.isNaN(d.getTime())) return evento.data_inicio;
  }

  if (evento.data_evento && evento.hora_evento) {
    const datePart = evento.data_evento.slice(0, 10);
    const hm = evento.hora_evento.trim().slice(0, 5);
    const combined = zonedWallClockToUtcIso(datePart, hm);
    if (combined) return combined;
  }

  if (evento.data_evento) {
    const d = new Date(evento.data_evento);
    if (!Number.isNaN(d.getTime())) return evento.data_evento;
  }

  return null;
}

/** Fim efetivo — data_fim é a fonte oficial; fallback início + duração padrão. */
export function agendaEventoEndIso(
  evento: AgendaEventoDatetimeFields,
  durationMinutes: number = VISITA_DURACAO_MINUTOS,
): string | null {
  if (evento.data_fim) {
    const d = new Date(evento.data_fim);
    if (!Number.isNaN(d.getTime())) return evento.data_fim;
  }

  const start = agendaEventoStartIso(evento);
  if (!start) return null;

  return new Date(
    new Date(start).getTime() + durationMinutes * 60_000,
  ).toISOString();
}

export function hasAgendaEventoStart(
  evento: AgendaEventoDatetimeFields | null | undefined,
): boolean {
  return agendaEventoStartIso(evento ?? {}) != null;
}

export function compareAgendaEventoStartAsc(
  a: AgendaEventoDatetimeFields,
  b: AgendaEventoDatetimeFields,
): number {
  const ta = agendaEventoStartIso(a);
  const tb = agendaEventoStartIso(b);
  if (!ta && !tb) return 0;
  if (!ta) return 1;
  if (!tb) return -1;
  return new Date(ta).getTime() - new Date(tb).getTime();
}

export function compareAgendaEventoStartDesc(
  a: AgendaEventoDatetimeFields,
  b: AgendaEventoDatetimeFields,
): number {
  return -compareAgendaEventoStartAsc(a, b);
}

export type VisitaInicialResumo = {
  id: string;
  data_inicio: string;
  data_fim: string | null;
  status: string;
  tipo_evento: string;
};

/** Normaliza visita técnica para UI — data_inicio/data_fim como fonte oficial. */
export function mapVisitaInicialResumo(
  visita:
    | (AgendaEventoDatetimeFields & {
        id: string;
        status: string;
        tipo_evento: string;
      })
    | null
    | undefined,
): VisitaInicialResumo | null {
  if (!visita) return null;

  const data_inicio = agendaEventoStartIso(visita);
  if (!data_inicio) return null;

  return {
    id: visita.id,
    data_inicio,
    data_fim: agendaEventoEndIso(visita),
    status: visita.status,
    tipo_evento: visita.tipo_evento,
  };
}

function horaEventoFromIso(
  isoInicio: string,
  timeZone: string = OPERATIONAL_TZ,
): string {
  const d = new Date(isoInicio);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  const s = parts.find((p) => p.type === "second")?.value ?? "00";
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}`;
}

/** Persiste data_inicio, data_fim, data_evento e hora_evento de forma consistente. */
export function spreadAgendaEventoDatetime(
  isoInicio: string,
  durationMinutes: number = VISITA_DURACAO_MINUTOS,
) {
  const start = new Date(isoInicio);
  if (Number.isNaN(start.getTime())) {
    throw new Error("data de início da agenda inválida");
  }
  const inicioUtc = start.toISOString();
  const fimUtc = new Date(
    start.getTime() + durationMinutes * 60_000,
  ).toISOString();

  return {
    data_inicio: inicioUtc,
    data_fim: fimUtc,
    data_evento: inicioUtc,
    hora_evento: horaEventoFromIso(inicioUtc),
  };
}

/** Colunas de agenda_eventos (sem endereco — vem do cliente). */
export const AGENDA_EVENTO_COLUMNS = [
  "id",
  "ordem_servico_id",
  "cliente_id",
  "equipe_id",
  "responsavel_id",
  "tipo_evento",
  "etapa",
  "status",
  "titulo",
  "descricao",
  "data_evento",
  "data_inicio",
  "data_fim",
  "hora_evento",
  "criado_em",
  "atualizado_em",
].join(", ");

/** Evento + endereco do cliente (relacionamento). */
export const AGENDA_EVENTO_WITH_CLIENTE_ENDERECO = `${AGENDA_EVENTO_COLUMNS}, clientes!cliente_id(id, endereco_formatado, latitude, longitude)`;

export type ClienteEnderecoAgenda = {
  id: string;
  endereco_formatado: string;
  latitude: number | null;
  longitude: number | null;
};
