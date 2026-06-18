"use server";

import { revalidatePath } from "next/cache";

import {
  avaliarSlotReagendamentoCalendario,
  type ValidarSlotVisitaResult,
} from "@/app/ordens-servico/agenda-disponibilidade";
import { getCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { isAdminOrManager } from "@/lib/auth/tipo-usuario";
import {
  resolveCalendarWorkspace,
  type CalendarWorkspaceQuery,
  type CalendarWorkspaceState,
} from "@/lib/calendar/resolve-calendar-workspace";
import { mondayOfOperationalWeek } from "@/lib/calendar/operational-calendar";
import {
  spreadAgendaEventoDatetime,
  spreadAgendaEventoRange,
} from "@/lib/ordens-servico/agenda-evento-query";
import { parseVisitaDateTime } from "@/lib/ordens-servico/datetime";
import { hojeOperacionalYmd, type AgendaSlotSugestao } from "@/lib/ordens-servico/visita-slots";
import { createClient } from "@/lib/supabase/server";

/** Carrega o calendário para uso embutido (modal do Centro Operacional). */
export async function fetchCalendarWorkspace(
  query: CalendarWorkspaceQuery = {},
  unidadeId: string | null = null,
): Promise<CalendarWorkspaceState> {
  const { usuario } = await getCurrentUsuario();
  if (!usuario?.ativo) {
    const hoje = hojeOperacionalYmd();
    return {
      view: "day",
      anchorDayYmd: hoje,
      initialMondayYmd: mondayOfOperationalWeek(hoje),
      eventos: [],
      equipes: [],
      selectedEquipeId: null,
      canFilterEquipes: false,
      error: "Session expired",
    };
  }
  return resolveCalendarWorkspace(usuario, query, { unidadeId });
}

export type ValidarReagendamentoCalendarioResult =
  | { ok: true }
  | {
      ok: false;
      conflito: true;
      horaSolicitada: string;
      sugestoes: AgendaSlotSugestao[];
      message: string;
    }
  | { ok: false; conflito: false; message: string };

export type SalvarReagendamentoCalendarioResult =
  | { ok: true }
  | {
      ok: false;
      conflito: true;
      horaSolicitada: string;
      sugestoes: AgendaSlotSugestao[];
      targetYmd: string;
      message: string;
    }
  | { ok: false; conflito: false; message: string };

function mapValidacaoParaCalendario(
  result: ValidarSlotVisitaResult,
): ValidarReagendamentoCalendarioResult {
  if (result.ok) return { ok: true };
  if ("conflito" in result && result.conflito) {
    return {
      ok: false,
      conflito: true,
      horaSolicitada: result.horaSolicitada,
      sugestoes: result.sugestoes,
      message: result.message,
    };
  }
  return { ok: false, conflito: false, message: result.message };
}

/** Valida disponibilidade do novo slot — mesma regra do agendamento de visitas. */
export async function validarReagendamentoCalendario(params: {
  equipeId: string | null;
  targetYmd: string;
  newStartIso: string;
  newEndIso?: string | null;
  excluirEventoId: string;
}): Promise<ValidarReagendamentoCalendarioResult> {
  if (!params.equipeId?.trim()) {
    return {
      ok: false,
      conflito: false,
      message: "Appointment has no linked team — cannot reschedule.",
    };
  }

  const validation = await avaliarSlotReagendamentoCalendario(
    params.equipeId,
    params.targetYmd,
    params.newStartIso,
    params.newEndIso ?? null,
    params.excluirEventoId,
  );

  return mapValidacaoParaCalendario(validation);
}

/** Persiste reagendamento após validar equipe + data + horário (mesma regra de visitas). */
export async function salvarReagendamentoCalendario(params: {
  eventoId: string;
  newStartIso: string;
  newEndIso?: string | null;
}): Promise<SalvarReagendamentoCalendarioResult> {
  const { usuario } = await getCurrentUsuario();
  if (!usuario?.ativo) {
    return { ok: false, conflito: false, message: "Session expired" };
  }

  const podeReagendar =
    usuario.pode_editar_agenda ||
    isAdminOrManager(usuario) ||
    usuario.pode_ver_todas_equipes;
  if (!podeReagendar) {
    return {
      ok: false,
      conflito: false,
      message: "No permission to reschedule calendar appointments",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, conflito: false, message: "Session expired" };
  }

  const { data: ev, error: loadErr } = await supabase
    .from("agenda_eventos")
    .select(
      "id, ordem_servico_id, cliente_id, equipe_id, etapa, tipo_evento, status",
    )
    .eq("id", params.eventoId)
    .single();

  if (loadErr || !ev) {
    return {
      ok: false,
      conflito: false,
      message: loadErr?.message ?? "Appointment not found",
    };
  }

  if (!ev.equipe_id) {
    return {
      ok: false,
      conflito: false,
      message: "Appointment has no linked team — cannot reschedule.",
    };
  }

  const { data: targetYmd } = parseVisitaDateTime(params.newStartIso);
  const validation = await avaliarSlotReagendamentoCalendario(
    ev.equipe_id,
    targetYmd,
    params.newStartIso,
    params.newEndIso ?? null,
    ev.id,
  );

  if (!validation.ok) {
    if ("conflito" in validation && validation.conflito) {
      return {
        ok: false,
        conflito: true,
        horaSolicitada: validation.horaSolicitada,
        sugestoes: validation.sugestoes,
        targetYmd,
        message: validation.message,
      };
    }
    return { ok: false, conflito: false, message: validation.message };
  }

  const datetimeFields = params.newEndIso
    ? spreadAgendaEventoRange(params.newStartIso, params.newEndIso)
    : spreadAgendaEventoDatetime(params.newStartIso);

  const { data: updated, error: updErr } = await supabase
    .from("agenda_eventos")
    .update({
      ...datetimeFields,
      equipe_id: ev.equipe_id,
    })
    .eq("id", ev.id)
    .select("id")
    .maybeSingle();

  if (updErr) {
    return { ok: false, conflito: false, message: updErr.message };
  }

  if (!updated) {
    return {
      ok: false,
      conflito: false,
      message: "No permission to change this calendar appointment",
    };
  }

  await supabase.from("agenda_eventos").insert({
    ordem_servico_id: ev.ordem_servico_id,
    cliente_id: ev.cliente_id,
    equipe_id: ev.equipe_id,
    responsavel_id: user.id,
    tipo_evento: "status_changed",
    etapa: ev.etapa,
    status: "completed",
    titulo: "status_changed",
    descricao: "Rescheduled in calendar",
    ...spreadAgendaEventoDatetime(new Date().toISOString()),
  });

  revalidatePath("/calendar");
  revalidatePath("/operacao");
  revalidatePath("/ordens-servico");
  if (ev.ordem_servico_id) {
    revalidatePath(`/os/${ev.ordem_servico_id}`);
  }

  return { ok: true };
}
