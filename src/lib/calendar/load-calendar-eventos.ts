import { createClient } from "@/lib/supabase/server";
import {
  eventoInWeekRange,
  mapRowToCalendarEvento,
  mondayOfOperationalWeek,
  weekBoundsIso,
  type CalendarEvento,
} from "@/lib/calendar/operational-calendar";

type AgendaRow = {
  id: string;
  ordem_servico_id: string;
  equipe_id: string | null;
  tipo_evento: string;
  status: string;
  data_evento: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  hora_evento: string | null;
  clientes: { nome: string } | null;
  equipes: { nome: string; cor_primaria: string; cor_secundaria: string } | null;
  ordens_servico: { etapa_atual: string | null } | null;
};

export type LoadCalendarEventosOptions = {
  equipeId?: string | null;
  unidadeId?: string | null;
};

export async function loadCalendarEventos(
  semanaYmd?: string,
  options?: LoadCalendarEventosOptions,
): Promise<{ eventos: CalendarEvento[]; mondayYmd: string; error?: string }> {
  const mondayYmd = mondayOfOperationalWeek(semanaYmd);
  const { start, end } = weekBoundsIso(mondayYmd);
  const equipeId = options?.equipeId?.trim() || null;
  const unidadeId = options?.unidadeId?.trim() || null;

  const supabase = await createClient();
  let query = supabase
    .from("agenda_eventos")
    .select(
      `
      id,
      ordem_servico_id,
      equipe_id,
      tipo_evento,
      status,
      data_evento,
      data_inicio,
      data_fim,
      hora_evento,
      clientes!cliente_id ( nome ),
      equipes!equipe_id ( nome, cor_primaria, cor_secundaria ),
      ordens_servico!ordem_servico_id ( etapa_atual )
    `,
    )
    .not("ordem_servico_id", "is", null)
    .or(
      `and(data_inicio.gte.${start},data_inicio.lt.${end}),and(data_evento.gte.${start},data_evento.lt.${end})`,
    );

  if (equipeId) {
    query = query.eq("equipe_id", equipeId);
  }

  if (unidadeId) {
    query = query.eq("unidade_id", unidadeId);
  }

  const { data, error } = await query;

  if (error) {
    return { eventos: [], mondayYmd, error: error.message };
  }

  const eventos = ((data ?? []) as AgendaRow[])
    .map(mapRowToCalendarEvento)
    .filter((ev): ev is CalendarEvento => ev != null)
    .filter((ev) => eventoInWeekRange(ev.startIso, start, end))
    .sort(
      (a, b) =>
        new Date(a.startIso).getTime() - new Date(b.startIso).getTime(),
    );

  return { eventos, mondayYmd };
}
