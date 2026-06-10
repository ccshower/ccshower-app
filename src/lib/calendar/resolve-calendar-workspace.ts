import {
  canFilterCalendarByEquipe,
  resolveCalendarEquipeFilter,
  type CalendarEquipeOption,
} from "@/lib/calendar/calendar-equipe-filter";
import { loadCalendarEventos } from "@/lib/calendar/load-calendar-eventos";
import {
  mondayOfOperationalWeek,
  parseCalendarViewMode,
  type CalendarEvento,
  type CalendarViewMode,
} from "@/lib/calendar/operational-calendar";
import { hojeOperacionalYmd } from "@/lib/ordens-servico/visita-slots";
import { createClient } from "@/lib/supabase/server";
import type { Usuario } from "@/lib/types/database";

export type CalendarWorkspaceQuery = {
  vista?: string;
  dia?: string;
  semana?: string;
  equipe?: string;
};

export type CalendarWorkspaceState = {
  view: CalendarViewMode;
  anchorDayYmd: string;
  initialMondayYmd: string;
  eventos: CalendarEvento[];
  equipes: CalendarEquipeOption[];
  selectedEquipeId: string | null;
  canFilterEquipes: boolean;
  error: string | null;
};

export type CalendarWorkspaceOptions = {
  /** Restringe os eventos a uma unidade (uso embutido no Centro Operacional). */
  unidadeId?: string | null;
};

/** Mesma resolução de vista/dados usada pela página oficial `/calendar`. */
export async function resolveCalendarWorkspace(
  usuario: Usuario,
  query: CalendarWorkspaceQuery = {},
  options: CalendarWorkspaceOptions = {},
): Promise<CalendarWorkspaceState> {
  const view = query.vista
    ? parseCalendarViewMode(query.vista)
    : query.semana?.trim()
      ? "week"
      : "day";
  const hoje = hojeOperacionalYmd();
  const anchorDayYmd = query.dia?.trim() || hoje;
  const semanaForLoad =
    view === "week"
      ? query.semana?.trim() || mondayOfOperationalWeek(hoje)
      : mondayOfOperationalWeek(anchorDayYmd);

  const equipeFilterId = resolveCalendarEquipeFilter(usuario, query.equipe);
  const canFilterEquipes = canFilterCalendarByEquipe(usuario);
  const unidadeScope =
    options.unidadeId ??
    (canFilterEquipes ? null : usuario.unidade_id ?? null);

  const supabase = await createClient();

  const [{ eventos, mondayYmd, error }, equipesRes] = await Promise.all([
    loadCalendarEventos(semanaForLoad, {
      equipeId: equipeFilterId,
      unidadeId: unidadeScope,
    }),
    canFilterEquipes
      ? supabase
          .from("equipes")
          .select("id, nome, cor_primaria")
          .eq("ativo", true)
          .order("nome", { ascending: true })
      : Promise.resolve({ data: [] as CalendarEquipeOption[], error: null }),
  ]);

  const equipes = (equipesRes.data ?? []) as CalendarEquipeOption[];
  const loadError = error ?? equipesRes.error?.message ?? null;

  return {
    view,
    anchorDayYmd,
    initialMondayYmd: mondayYmd,
    eventos,
    equipes,
    selectedEquipeId: equipeFilterId,
    canFilterEquipes,
    error: loadError,
  };
}
