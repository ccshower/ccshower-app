"use server";

import {
  isCalendarAgendaEvent,
  operationalWallClockHm,
  addDaysOperationalYmd,
} from "@/lib/calendar/operational-calendar";
import {
  agendaEventoStartIso,
  AGENDA_EVENTO_DATETIME_COLUMNS,
} from "@/lib/ordens-servico/agenda-evento-query";
import {
  mapAgendaEquipeDiaResumo,
  type AgendaEquipeDiaResumo,
  type AgendaEventoEquipeDiaRow,
  type CompromissoEquipeDia,
  type RotaParadaAgenda,
} from "@/lib/ordens-servico/agenda-equipe-dia";
import { parseVisitaDateTime } from "@/lib/ordens-servico/datetime";
import {
  isoRangeDiaOperacional,
  normalizarSlotHora,
  proximosSlotsDisponiveis,
  proximosSlotsDisponiveisHoje,
  proximosSlotsDisponiveisNoDia,
  slotEstaOcupado,
  slotsOcupadosFromEventos,
  horarioOperacionalJaPassou,
  hojeOperacionalYmd,
  VISITA_SLOTS_HORARIOS,
  type AgendaSlotSugestao,
  type VisitaSlotHora,
} from "@/lib/ordens-servico/visita-slots";
import { createClient } from "@/lib/supabase/server";

/** Resolve slot oficial a partir do ISO (parse + hora de parede do calendário). */
function resolverSlotOperacionalFromIso(iso: string): VisitaSlotHora | null {
  const { hora } = parseVisitaDateTime(iso);
  const fromParse = normalizarSlotHora(hora);
  if (fromParse) return fromParse;
  const hm = operationalWallClockHm(iso);
  return hm ? normalizarSlotHora(hm) : null;
}

const AGENDA_STATUS_CANCELADOS = new Set(["cancelled", "cancelado"]);

function isEventoAgendaAtivo(status: string | null | undefined): boolean {
  return !AGENDA_STATUS_CANCELADOS.has(status ?? "");
}

export type ValidarSlotVisitaResult =
  | { ok: true }
  | { ok: false; message: string }
  | {
      ok: false;
      message: string;
      conflito: true;
      horaSolicitada: string;
      sugestoes: AgendaSlotSugestao[];
    };

const AGENDA_EQUIPE_DIA_SELECT = `${AGENDA_EVENTO_DATETIME_COLUMNS}, cliente_id, titulo, clientes!cliente_id ( nome, endereco_formatado, latitude, longitude )`;

type AgendaEventoDiaRow = AgendaEventoEquipeDiaRow;

function normalizarHoraParede(hm: string): string | null {
  const m = hm.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** Mesma hora de parede (HH:mm) que outro compromisso ativo no dia. */
function horaParedeConflita(
  eventos: AgendaEventoDiaRow[],
  hmSolicitado: string,
): boolean {
  const alvo = normalizarHoraParede(hmSolicitado);
  if (!alvo) return false;

  for (const ev of eventos) {
    const iso = agendaEventoStartIso(ev);
    if (!iso) continue;
    const hm =
      operationalWallClockHm(iso) ??
      normalizarHoraParede(parseVisitaDateTime(iso).hora);
    if (hm && hm === alvo) return true;
  }

  return false;
}

async function listarEventosAgendaEquipeNoDia(
  equipeId: string,
  dataVisita: string,
  excluirEventoId?: string | null,
): Promise<{ eventos: AgendaEventoDiaRow[]; error?: string }> {
  if (!equipeId?.trim()) {
    return { eventos: [], error: "Select a team" };
  }

  const range = isoRangeDiaOperacional(dataVisita);
  if (!range) {
    return { eventos: [], error: "Invalid date" };
  }

  const supabase = await requireAuthSupabase();
  const { data, error } = await supabase
    .from("agenda_eventos")
    .select(AGENDA_EQUIPE_DIA_SELECT)
    .eq("equipe_id", equipeId)
    .or(
      `and(data_inicio.gte.${range.start},data_inicio.lte.${range.end}),and(data_evento.gte.${range.start},data_evento.lte.${range.end})`,
    );

  if (error) return { eventos: [], error: error.message };

  const eventos = (data ?? []).filter(
    (e) =>
      (!excluirEventoId || e.id !== excluirEventoId) &&
      isEventoAgendaAtivo(e.status) &&
      isCalendarAgendaEvent(e.tipo_evento),
  ) as AgendaEventoDiaRow[];

  return { eventos };
}

function resultadoConflitoAgenda(
  dataVisita: string,
  horaSolicitada: string,
  ocupados: readonly string[],
): Extract<ValidarSlotVisitaResult, { conflito: true }> {
  const refSlot = normalizarSlotHora(horaSolicitada);
  return {
    ok: false,
    conflito: true,
    horaSolicitada,
    sugestoes: proximosSlotsDisponiveis(
      ocupados,
      refSlot ?? horaSolicitada,
      3,
    ).map((hora) => ({ dataYmd: dataVisita, hora })),
    message: `Time ${horaSolicitada} unavailable for this team on this date`,
  };
}

const MAX_DIAS_SUGESTAO_AGENDA = 14;

async function buscarProximasSugestoesAgenda(
  equipeId: string,
  dataInicial: string,
  excluirEventoId: string | null | undefined,
  limite = 3,
): Promise<AgendaSlotSugestao[]> {
  const out: AgendaSlotSugestao[] = [];
  const hoje = hojeOperacionalYmd();
  let data = dataInicial;

  for (let dia = 0; dia < MAX_DIAS_SUGESTAO_AGENDA && out.length < limite; dia++) {
    const { ocupados, error } = await buscarHorariosOcupadosVisita(
      equipeId,
      data,
      data === dataInicial ? excluirEventoId : undefined,
    );
    if (error) break;

    const restantes =
      data === hoje
        ? proximosSlotsDisponiveisHoje(data, ocupados, limite - out.length)
        : proximosSlotsDisponiveisNoDia(data, ocupados, limite - out.length);

    out.push(...restantes);
    data = addDaysOperationalYmd(data, 1);
  }

  return out;
}

async function requireAuthSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired");
  return supabase;
}

export type BuscarAgendaEquipeNoDiaResult = AgendaEquipeDiaResumo & {
  ocupados: VisitaSlotHora[];
  error?: string;
};

/** Compromissos da equipe no dia + slots ocupados (agenda_eventos). */
export async function buscarAgendaEquipeNoDia(
  equipeId: string,
  dataVisita: string,
  excluirEventoId?: string | null,
): Promise<BuscarAgendaEquipeNoDiaResult> {
  const vazio: BuscarAgendaEquipeNoDiaResult = {
    compromissos: [],
    paradasRota: [],
    ocupados: [],
  };

  try {
    if (!equipeId?.trim()) {
      return { ...vazio, error: "Select a team" };
    }

    const range = isoRangeDiaOperacional(dataVisita);
    if (!range) {
      return { ...vazio, error: "Invalid date" };
    }

    const { eventos, error } = await listarEventosAgendaEquipeNoDia(
      equipeId,
      dataVisita,
      excluirEventoId,
    );

    if (error) return { ...vazio, error };

    const resumo = mapAgendaEquipeDiaResumo(eventos);
    return {
      ...resumo,
      ocupados: slotsOcupadosFromEventos(eventos),
    };
  } catch (e) {
    return {
      ...vazio,
      error: e instanceof Error ? e.message : "Error loading schedule",
    };
  }
}

/** Horários já ocupados da equipe na data (agenda_eventos). */
export async function buscarHorariosOcupadosVisita(
  equipeId: string,
  dataVisita: string,
  excluirEventoId?: string | null,
): Promise<{ ocupados: string[]; error?: string }> {
  const r = await buscarAgendaEquipeNoDia(equipeId, dataVisita, excluirEventoId);
  return { ocupados: r.ocupados, error: r.error };
}

export type { CompromissoEquipeDia, RotaParadaAgenda };

/** Valida conflito equipe + data + hora antes de gravar evento. */
export async function validarSlotVisitaDisponivel(
  equipeId: string,
  dataVisita: string,
  horaVisita: string,
  excluirEventoId?: string | null,
): Promise<ValidarSlotVisitaResult> {
  const slot = normalizarSlotHora(horaVisita);
  if (!slot) {
    return { ok: false, message: "Invalid visit time" };
  }
  if (!VISITA_SLOTS_HORARIOS.includes(slot)) {
    return {
      ok: false,
      message: "Select an available time slot in the schedule",
    };
  }

  const { ocupados, error } = await buscarHorariosOcupadosVisita(
    equipeId,
    dataVisita,
    excluirEventoId,
  );

  if (error) return { ok: false, message: error };

  if (slotEstaOcupado(ocupados, slot)) {
    return resultadoConflitoAgenda(dataVisita, slot, ocupados);
  }

  return { ok: true };
}

/**
 * Reagendamento no calendário: mesma ocupação da agenda de visitas (slots + hora de parede),
 * sem exigir VISITA_SLOTS no compromisso que já existe.
 */
export async function avaliarSlotReagendamentoCalendario(
  equipeId: string,
  dataVisita: string,
  isoInicio: string,
  excluirEventoId?: string | null,
): Promise<ValidarSlotVisitaResult> {
  const hm =
    operationalWallClockHm(isoInicio) ??
    normalizarHoraParede(parseVisitaDateTime(isoInicio).hora);
  if (!hm) {
    return { ok: false, message: "Invalid appointment date or time" };
  }

  const slot = resolverSlotOperacionalFromIso(isoInicio);
  const horaExibicao = slot ?? hm;

  const { eventos, error } = await listarEventosAgendaEquipeNoDia(
    equipeId,
    dataVisita,
    excluirEventoId,
  );
  if (error) return { ok: false, message: error };

  const ocupados = slotsOcupadosFromEventos(eventos);

  if (horarioOperacionalJaPassou(dataVisita, hm)) {
    const sugestoes = await buscarProximasSugestoesAgenda(
      equipeId,
      dataVisita,
      excluirEventoId,
      3,
    );
    return {
      ok: false,
      conflito: true,
      horaSolicitada: horaExibicao,
      sugestoes,
      message: `Time ${horaExibicao} has already passed for today`,
    };
  }

  if (slot && slotEstaOcupado(ocupados, slot)) {
    return resultadoConflitoAgenda(dataVisita, horaExibicao, ocupados);
  }

  if (horaParedeConflita(eventos, hm)) {
    return resultadoConflitoAgenda(dataVisita, horaExibicao, ocupados);
  }

  return { ok: true };
}
