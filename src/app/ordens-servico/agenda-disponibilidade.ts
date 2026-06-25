"use server";

import {
  isCalendarAgendaEvent,
  operationalWallClockHm,
  addDaysOperationalYmd,
} from "@/lib/calendar/operational-calendar";
import {
  agendaEventoEndIso,
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
  formatIntervaloAgenda,
  horaFimPadraoParaInicio,
  dataAgendaAntesDoPermitido,
  horarioOperacionalJaPassou,
  hojeOperacionalYmd,
  intervaloTemConflito,
  intervalosOcupadosFromEventos,
  isoRangeDiaOperacional,
  normalizarSlotHora,
  proximosSlotsDisponiveis,
  proximosSlotsDisponiveisHoje,
  proximosSlotsDisponiveisNoDia,
  validarIntervaloAgenda,
  VISITA_SLOTS_HORARIOS,
  type AgendaIntervaloOcupado,
  type AgendaSlotSugestao,
  type VisitaSlotHora,
} from "@/lib/ordens-servico/visita-slots";
import { createClient } from "@/lib/supabase/server";
import { usuarioPodeLancarDatasRetroativas } from "@/lib/auth/admin-datas-retroativas";
import { getCurrentUsuario } from "@/lib/auth/get-current-usuario";

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
      horaFimSolicitada: string;
      sugestoes: AgendaSlotSugestao[];
    };

const AGENDA_EQUIPE_DIA_SELECT = `${AGENDA_EVENTO_DATETIME_COLUMNS}, cliente_id, titulo, clientes!cliente_id ( nome, endereco_formatado, latitude, longitude )`;

type AgendaEventoDiaRow = AgendaEventoEquipeDiaRow;

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
  horaInicio: string,
  horaFim: string,
  ocupados: readonly AgendaIntervaloOcupado[],
): Extract<ValidarSlotVisitaResult, { conflito: true }> {
  const refSlot = normalizarSlotHora(horaInicio) ?? horaInicio;
  return {
    ok: false,
    conflito: true,
    horaSolicitada: horaInicio,
    horaFimSolicitada: horaFim,
    sugestoes: proximosSlotsDisponiveis(ocupados, refSlot, 3).map((s) => ({
      ...s,
      dataYmd: dataVisita,
    })),
    message: `Time ${formatIntervaloAgenda(horaInicio, horaFim)} unavailable for this team on this date`,
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
    const { intervalos, error } = await buscarIntervalosOcupadosVisita(
      equipeId,
      data,
      data === dataInicial ? excluirEventoId : undefined,
    );
    if (error) break;

    const restantes =
      data === hoje
        ? proximosSlotsDisponiveisHoje(data, intervalos, limite - out.length)
        : proximosSlotsDisponiveisNoDia(data, intervalos, limite - out.length);

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

async function loadAgendaRetroativaOpts() {
  const { usuario } = await getCurrentUsuario();
  const permitirDatasRetroativas = usuarioPodeLancarDatasRetroativas(usuario);
  return { permitirDatasRetroativas };
}

export type BuscarAgendaEquipeNoDiaResult = AgendaEquipeDiaResumo & {
  ocupados: VisitaSlotHora[];
  intervalos: AgendaIntervaloOcupado[];
  error?: string;
};

/** Compromissos da equipe no dia + intervalos ocupados (agenda_eventos). */
export async function buscarAgendaEquipeNoDia(
  equipeId: string,
  dataVisita: string,
  excluirEventoId?: string | null,
): Promise<BuscarAgendaEquipeNoDiaResult> {
  const vazio: BuscarAgendaEquipeNoDiaResult = {
    compromissos: [],
    paradasRota: [],
    ocupados: [],
    intervalos: [],
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

    const intervalos = intervalosOcupadosFromEventos(eventos);
    const resumo = mapAgendaEquipeDiaResumo(eventos);
    return {
      ...resumo,
      intervalos,
      ocupados: intervalos.map((i) => i.inicio),
    };
  } catch (e) {
    return {
      ...vazio,
      error: e instanceof Error ? e.message : "Error loading schedule",
    };
  }
}

/** Intervalos já ocupados da equipe na data (agenda_eventos). */
export async function buscarIntervalosOcupadosVisita(
  equipeId: string,
  dataVisita: string,
  excluirEventoId?: string | null,
): Promise<{ intervalos: AgendaIntervaloOcupado[]; error?: string }> {
  const r = await buscarAgendaEquipeNoDia(equipeId, dataVisita, excluirEventoId);
  return { intervalos: r.intervalos, error: r.error };
}

/** @deprecated Prefer buscarIntervalosOcupadosVisita */
export async function buscarHorariosOcupadosVisita(
  equipeId: string,
  dataVisita: string,
  excluirEventoId?: string | null,
): Promise<{ ocupados: string[]; error?: string }> {
  const r = await buscarAgendaEquipeNoDia(equipeId, dataVisita, excluirEventoId);
  return { ocupados: r.ocupados, error: r.error };
}

export type { CompromissoEquipeDia, RotaParadaAgenda };

function resolverHoraFimSolicitada(
  horaInicio: string,
  horaFim?: string | null,
): VisitaSlotHora | null {
  if (horaFim?.trim()) {
    const parsed = validarIntervaloAgenda(horaInicio, horaFim);
    return parsed.ok ? parsed.fim : null;
  }
  return horaFimPadraoParaInicio(horaInicio);
}

function isEventoId(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return /^[0-9a-f-]{36}$/i.test(value.trim());
}

/** Valida conflito equipe + data + intervalo antes de gravar evento. */
export async function validarSlotVisitaDisponivel(
  equipeId: string,
  dataVisita: string,
  horaInicio: string,
  horaFimOuExcluir?: string | null,
  excluirEventoId?: string | null,
): Promise<ValidarSlotVisitaResult> {
  const { permitirDatasRetroativas } = await loadAgendaRetroativaOpts();
  const retroOpts = { permitirDatasRetroativas };

  if (dataAgendaAntesDoPermitido(dataVisita, retroOpts)) {
    return {
      ok: false,
      message: "Appointment date is too far in the past",
    };
  }

  let horaFim: string | null | undefined = horaFimOuExcluir;
  let excluirId = excluirEventoId ?? null;

  if (isEventoId(horaFimOuExcluir)) {
    excluirId = horaFimOuExcluir!.trim();
    horaFim = null;
  }

  const intervalo = validarIntervaloAgenda(
    horaInicio,
    horaFim ?? resolverHoraFimSolicitada(horaInicio, null) ?? "",
  );
  if (!intervalo.ok) {
    return { ok: false, message: intervalo.message };
  }

  if (!VISITA_SLOTS_HORARIOS.includes(intervalo.inicio)) {
    return {
      ok: false,
      message: "Select an available time slot in the schedule",
    };
  }

  const { intervalos, error } = await buscarIntervalosOcupadosVisita(
    equipeId,
    dataVisita,
    excluirId,
  );

  if (error) return { ok: false, message: error };

  if (
    intervaloTemConflito(intervalo.inicio, intervalo.fim, intervalos)
  ) {
    return resultadoConflitoAgenda(
      dataVisita,
      intervalo.inicio,
      intervalo.fim,
      intervalos,
    );
  }

  return { ok: true };
}

/**
 * Reagendamento no calendário: valida intervalo completo (início + fim efetivo).
 */
export async function avaliarSlotReagendamentoCalendario(
  equipeId: string,
  dataVisita: string,
  isoInicio: string,
  isoFim: string | null | undefined,
  excluirEventoId?: string | null,
): Promise<ValidarSlotVisitaResult> {
  const { permitirDatasRetroativas } = await loadAgendaRetroativaOpts();
  const retroOpts = { permitirDatasRetroativas };

  const hmInicio =
    operationalWallClockHm(isoInicio) ??
    parseVisitaDateTime(isoInicio).hora.slice(0, 5);
  if (!hmInicio) {
    return { ok: false, message: "Invalid appointment date or time" };
  }

  if (dataAgendaAntesDoPermitido(dataVisita, retroOpts)) {
    return {
      ok: false,
      message: "Appointment date is too far in the past",
    };
  }

  const hmFim =
    (isoFim ? operationalWallClockHm(isoFim) : null) ??
    (isoFim ? parseVisitaDateTime(isoFim).hora.slice(0, 5) : null) ??
    resolverHoraFimSolicitada(hmInicio, null);

  if (!hmFim) {
    return { ok: false, message: "Invalid appointment end time" };
  }

  if (!permitirDatasRetroativas && horarioOperacionalJaPassou(dataVisita, hmInicio)) {
    const sugestoes = await buscarProximasSugestoesAgenda(
      equipeId,
      dataVisita,
      excluirEventoId,
      3,
    );
    return {
      ok: false,
      conflito: true,
      horaSolicitada: hmInicio,
      horaFimSolicitada: hmFim,
      sugestoes,
      message: `Time ${formatIntervaloAgenda(hmInicio, hmFim)} has already passed for today`,
    };
  }

  return validarSlotVisitaDisponivel(
    equipeId,
    dataVisita,
    hmInicio,
    hmFim,
    excluirEventoId,
  );
}
