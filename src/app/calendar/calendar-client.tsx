"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  salvarReagendamentoCalendario,
  validarReagendamentoCalendario,
} from "@/app/calendar/actions";
import { CalendarConflictModal } from "@/components/calendar/calendar-conflict-modal";
import type { CalendarConflictDraft } from "@/components/calendar/calendar-conflict-modal";
import { CalendarDayView } from "@/components/calendar/calendar-day-view";
import { CalendarEquipeFilterSelect } from "@/components/calendar/calendar-equipe-filter-select";
import { CalendarMonthView } from "@/components/calendar/calendar-month-view";
import { CalendarRescheduleModal } from "@/components/calendar/calendar-reschedule-modal";
import { CalendarViewToggle } from "@/components/calendar/calendar-view-toggle";
import { CalendarWeekView } from "@/components/calendar/calendar-week-view";
import type { CalendarEquipeOption } from "@/lib/calendar/calendar-equipe-filter";
import {
  addDaysOperationalYmd,
  calendarHref,
  filterEventosForDay,
  formatCalendarDayTitle,
  formatCalendarWeekRange,
  groupEventsByDay,
  mondayOfOperationalWeek,
  parseCalendarDragPayload,
  rescheduleEventToDay,
  weekDayYmds,
  type CalendarEvento,
  type CalendarRescheduleDraft,
  type CalendarViewMode,
} from "@/lib/calendar/operational-calendar";
import { t } from "@/lib/i18n";
import { buildDataEventoIso } from "@/lib/ordens-servico/datetime";
import type { AgendaSlotSugestao } from "@/lib/ordens-servico/visita-slots";
import { hojeOperacionalYmd } from "@/lib/ordens-servico/visita-slots";

export type CalendarNavigateQuery = {
  vista?: CalendarViewMode;
  dia?: string;
  semana?: string;
  equipe?: string | null;
};

type Props = {
  view: CalendarViewMode;
  anchorDayYmd: string;
  initialMondayYmd: string;
  eventos: CalendarEvento[];
  equipes: CalendarEquipeOption[];
  selectedEquipeId: string | null;
  canFilterEquipes: boolean;
  /** Modo embutido (modal): navegação e refresh viram callbacks em vez de rotas. */
  embedded?: boolean;
  onEmbeddedNavigate?: (next: CalendarNavigateQuery) => void;
  onEmbeddedRefresh?: () => void;
};

function useDesktopDragEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return enabled;
}

export function CalendarClient({
  view,
  anchorDayYmd,
  initialMondayYmd,
  eventos,
  equipes,
  selectedEquipeId,
  canFilterEquipes,
  embedded = false,
  onEmbeddedNavigate,
  onEmbeddedRefresh,
}: Props) {
  const router = useRouter();
  const dragEnabled = useDesktopDragEnabled() && view !== "month";
  const weekDays = useMemo(
    () => weekDayYmds(initialMondayYmd),
    [initialMondayYmd],
  );
  const byDay = useMemo(
    () => groupEventsByDay(eventos, weekDays),
    [eventos, weekDays],
  );
  const dayEvents = useMemo(
    () => filterEventosForDay(eventos, anchorDayYmd),
    [eventos, anchorDayYmd],
  );

  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dragOverYmd, setDragOverYmd] = useState<string | null>(null);
  const [rescheduleDraft, setRescheduleDraft] =
    useState<CalendarRescheduleDraft | null>(null);
  const [conflictDraft, setConflictDraft] =
    useState<CalendarConflictDraft | null>(null);
  const [validatedMessage, setValidatedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validatingDrop, setValidatingDrop] = useState(false);
  const [savingReschedule, setSavingReschedule] = useState(false);
  const [pickingConflictSlotKey, setPickingConflictSlotKey] = useState<
    string | null
  >(null);

  async function applyRescheduleResult(
    evento: CalendarEvento,
    sourceYmd: string,
    newStartIso: string,
  ) {
    const result = await salvarReagendamentoCalendario({
      eventoId: evento.id,
      newStartIso,
    });

    if (result.ok) {
      setRescheduleDraft(null);
      setConflictDraft(null);
      setValidatedMessage(t("calendar.reschedule.validated"));
      if (embedded && onEmbeddedRefresh) {
        onEmbeddedRefresh();
      } else {
        router.refresh();
      }
      window.setTimeout(() => setValidatedMessage(null), 4000);
      return;
    }

    if (result.conflito) {
      setRescheduleDraft(null);
      setConflictDraft({
        evento,
        sourceYmd,
        targetYmd: result.targetYmd,
        currentStartIso: evento.startIso,
        requestedStartIso: newStartIso,
        horaSolicitada: result.horaSolicitada,
        sugestoes: result.sugestoes,
        message: result.message,
      });
      return;
    }

    setErrorMessage(result.message);
  }

  function navigateHref(next: {
    vista?: CalendarViewMode;
    dia?: string;
    semana?: string;
  }) {
    const target: CalendarNavigateQuery = {
      vista: next.vista ?? view,
      dia: next.dia,
      semana: next.semana,
      equipe: selectedEquipeId,
    };
    if (embedded && onEmbeddedNavigate) {
      onEmbeddedNavigate(target);
      return;
    }
    router.push(calendarHref(target));
  }

  function onEquipeChange(nextEquipeId: string) {
    const target: CalendarNavigateQuery = {
      vista: view,
      dia: view === "day" ? anchorDayYmd : undefined,
      semana: view === "week" ? initialMondayYmd : undefined,
      equipe: nextEquipeId || null,
    };
    if (embedded && onEmbeddedNavigate) {
      onEmbeddedNavigate(target);
      return;
    }
    router.push(calendarHref(target));
  }

  function handleDragLeaveDay(ymd: string) {
    setDragOverYmd((current) => (current === ymd ? null : current));
  }

  async function handleDrop(targetYmd: string, rawPayload: string) {
    const payload = parseCalendarDragPayload(rawPayload);
    if (!payload || payload.sourceYmd === targetYmd) return;

    const evento = eventos.find((ev) => ev.id === payload.eventId);
    if (!evento) return;

    const newStartIso = rescheduleEventToDay(evento.startIso, targetYmd);
    if (!newStartIso) return;

    setErrorMessage(null);
    setValidatingDrop(true);

    try {
      const result = await validarReagendamentoCalendario({
        equipeId: evento.equipe_id,
        targetYmd,
        newStartIso,
        excluirEventoId: evento.id,
      });

      if (result.ok) {
        setRescheduleDraft({
          evento,
          sourceYmd: payload.sourceYmd,
          targetYmd,
          currentStartIso: evento.startIso,
          newStartIso,
        });
        return;
      }

      if (result.conflito) {
        setConflictDraft({
          evento,
          sourceYmd: payload.sourceYmd,
          targetYmd,
          currentStartIso: evento.startIso,
          requestedStartIso: newStartIso,
          horaSolicitada: result.horaSolicitada,
          sugestoes: result.sugestoes,
          message: result.message,
        });
        return;
      }

      setErrorMessage(result.message);
    } finally {
      setValidatingDrop(false);
      setDraggingEventId(null);
      setDragOverYmd(null);
    }
  }

  async function pickAlternativeSlot(sugestao: AgendaSlotSugestao) {
    if (!conflictDraft || savingReschedule) return;

    const newStartIso = buildDataEventoIso(sugestao.dataYmd, sugestao.hora);
    if (!newStartIso) return;

    const draft = conflictDraft;
    const slotKey = `${sugestao.dataYmd}-${sugestao.hora}`;

    setErrorMessage(null);
    setSavingReschedule(true);
    setPickingConflictSlotKey(slotKey);

    try {
      await applyRescheduleResult(draft.evento, draft.sourceYmd, newStartIso);
    } finally {
      setSavingReschedule(false);
      setPickingConflictSlotKey(null);
    }
  }

  async function confirmReschedule() {
    if (!rescheduleDraft || savingReschedule) return;

    setSavingReschedule(true);
    setErrorMessage(null);

    try {
      await applyRescheduleResult(
        rescheduleDraft.evento,
        rescheduleDraft.sourceYmd,
        rescheduleDraft.newStartIso,
      );
    } finally {
      setSavingReschedule(false);
    }
  }

  const subtitle =
    view === "day"
      ? formatCalendarDayTitle(anchorDayYmd)
      : view === "week"
        ? formatCalendarWeekRange(initialMondayYmd)
        : formatCalendarWeekRange(initialMondayYmd);

  const dragHandlers = {
    onDragStart: setDraggingEventId,
    onDragEnd: () => {
      setDraggingEventId(null);
      setDragOverYmd(null);
    },
    onDragOver: setDragOverYmd,
    onDragLeave: handleDragLeaveDay,
    onDrop: (ymd: string, raw: string) => void handleDrop(ymd, raw),
  };

  return (
    <div className="space-y-4">
      {validatedMessage ? (
        <p
          className="rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {validatedMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p
          className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {validatingDrop || savingReschedule ? (
        <p className="text-sm font-light text-cc-muted" role="status">
          {savingReschedule
            ? t("calendar.reschedule.saving")
            : t("calendar.reschedule.validating")}
        </p>
      ) : null}

      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {!embedded ? (
              <h1 className="font-display text-2xl font-light text-cc-ink">
                {t("calendar.title")}
              </h1>
            ) : null}
            <p className={`text-sm font-light capitalize text-cc-muted ${embedded ? "" : "mt-1"}`}>
              {subtitle}
            </p>
          </div>
          <CalendarViewToggle
            view={view}
            diaYmd={anchorDayYmd}
            mondayYmd={initialMondayYmd}
            equipeId={selectedEquipeId}
            onViewChange={
              embedded && onEmbeddedNavigate
                ? (mode) =>
                    onEmbeddedNavigate({
                      vista: mode,
                      dia: mode === "day" ? anchorDayYmd : undefined,
                      semana: mode === "week" ? initialMondayYmd : undefined,
                      equipe: selectedEquipeId,
                    })
                : undefined
            }
          />
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {canFilterEquipes && equipes.length > 0 ? (
            <label className="flex min-w-[10rem] flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
                {t("calendar.filterTeam")}
              </span>
              <CalendarEquipeFilterSelect
                equipes={equipes}
                selectedEquipeId={selectedEquipeId}
                onChange={onEquipeChange}
              />
            </label>
          ) : null}

          {view === "day" ? (
            <>
              <button
                type="button"
                onClick={() =>
                  navigateHref({
                    dia: addDaysOperationalYmd(anchorDayYmd, -1),
                  })
                }
                className="rounded-sm border border-cc-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
              >
                {t("calendar.prevDay")}
              </button>
              <button
                type="button"
                onClick={() =>
                  navigateHref({ dia: hojeOperacionalYmd() })
                }
                className="rounded-sm border border-cc-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
              >
                {t("calendar.today")}
              </button>
              <button
                type="button"
                onClick={() =>
                  navigateHref({
                    dia: addDaysOperationalYmd(anchorDayYmd, 1),
                  })
                }
                className="rounded-sm border border-cc-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
              >
                {t("calendar.nextDay")}
              </button>
            </>
          ) : view === "week" ? (
            <>
              <button
                type="button"
                onClick={() =>
                  navigateHref({
                    semana: addDaysOperationalYmd(initialMondayYmd, -7),
                  })
                }
                className="rounded-sm border border-cc-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
              >
                {t("calendar.prevWeek")}
              </button>
              <button
                type="button"
                onClick={() =>
                  navigateHref({
                    semana: mondayOfOperationalWeek(hojeOperacionalYmd()),
                  })
                }
                className="rounded-sm border border-cc-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
              >
                {t("calendar.today")}
              </button>
              <button
                type="button"
                onClick={() =>
                  navigateHref({
                    semana: addDaysOperationalYmd(initialMondayYmd, 7),
                  })
                }
                className="rounded-sm border border-cc-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
              >
                {t("calendar.nextWeek")}
              </button>
            </>
          ) : null}
        </div>
      </header>

      {view === "day" ? (
        <CalendarDayView
          ymd={anchorDayYmd}
          eventos={dayEvents}
          dragEnabled={dragEnabled}
          draggingEventId={draggingEventId}
          dragOverYmd={dragOverYmd}
          {...dragHandlers}
        />
      ) : null}

      {view === "week" ? (
        <CalendarWeekView
          weekDays={weekDays}
          byDay={byDay}
          dragEnabled={dragEnabled}
          draggingEventId={draggingEventId}
          dragOverYmd={dragOverYmd}
          {...dragHandlers}
        />
      ) : null}

      {view === "month" ? <CalendarMonthView /> : null}

      <CalendarRescheduleModal
        draft={rescheduleDraft}
        saving={savingReschedule}
        onClose={() => setRescheduleDraft(null)}
        onConfirm={() => void confirmReschedule()}
      />

      <CalendarConflictModal
        draft={conflictDraft}
        saving={savingReschedule}
        pickingSlotKey={pickingConflictSlotKey}
        onClose={() => setConflictDraft(null)}
        onPickSlot={(sugestao) => void pickAlternativeSlot(sugestao)}
      />
    </div>
  );
}
