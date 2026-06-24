"use client";

import { useMemo } from "react";

import { CalendarEventCard } from "@/components/calendar/calendar-event-card";
import {
  CALENDAR_DRAG_MIME,
  formatAgendaSlotTimeLabel,
  formatCalendarDayHeader,
  groupCalendarEventosByAgendaSlot,
  isTodayOperational,
  type CalendarEvento,
} from "@/lib/calendar/operational-calendar";
import { t } from "@/lib/i18n";
import {
  VISITA_SLOTS_HORARIOS,
  type VisitaSlotHora,
} from "@/lib/ordens-servico/visita-slots";

type Props = {
  weekDays: string[];
  byDay: Map<string, CalendarEvento[]>;
  dragEnabled: boolean;
  draggingEventId: string | null;
  dragOverYmd: string | null;
  onDragStart: (eventId: string) => void;
  onDragEnd: () => void;
  onDragOver: (ymd: string) => void;
  onDragLeave: (ymd: string) => void;
  onDrop: (ymd: string, rawPayload: string) => void;
};

function WeekDaySlotCell({
  ymd,
  slot,
  slotEvents,
  dragEnabled,
  draggingEventId,
  dragOverYmd,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  ymd: string;
  slot: VisitaSlotHora;
  slotEvents: CalendarEvento[];
  dragEnabled: boolean;
  draggingEventId: string | null;
  dragOverYmd: string | null;
  onDragStart: (eventId: string) => void;
  onDragEnd: () => void;
  onDragOver: (ymd: string) => void;
  onDragLeave: (ymd: string) => void;
  onDrop: (ymd: string, rawPayload: string) => void;
}) {
  const isDropTarget = dragOverYmd === ymd && draggingEventId != null;

  return (
    <div
      className={`min-h-[2.75rem] border-l border-cc-border/50 p-1 transition-colors ${
        isDropTarget ? "bg-cc-border-light/40" : ""
      }`}
      onDragOver={(event) => {
        if (!dragEnabled || !draggingEventId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOver(ymd);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        onDragLeave(ymd);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const raw =
          event.dataTransfer.getData(CALENDAR_DRAG_MIME) ||
          event.dataTransfer.getData("text/plain");
        onDrop(ymd, raw);
      }}
    >
      {slotEvents.length === 0 ? (
        <div
          className="h-full min-h-[2rem] rounded-sm border border-dashed border-cc-border/40 bg-cc-surface/20"
          aria-label={t("calendar.openSlot")}
        />
      ) : (
        <ul className="space-y-1">
          {slotEvents.map((ev) => (
            <li key={ev.id}>
              <CalendarEventCard
                ev={ev}
                sourceYmd={ymd}
                variant="compact"
                dragEnabled={dragEnabled}
                isDragging={draggingEventId === ev.id}
                onDragStart={() => onDragStart(ev.id)}
                onDragEnd={onDragEnd}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CalendarWeekView({
  weekDays,
  byDay,
  dragEnabled,
  draggingEventId,
  dragOverYmd,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: Props) {
  const labelYmd = weekDays[0] ?? "";

  const eventosPorDiaSlot = useMemo(() => {
    const map = new Map<string, Map<VisitaSlotHora, CalendarEvento[]>>();
    for (const ymd of weekDays) {
      map.set(ymd, groupCalendarEventosByAgendaSlot(byDay.get(ymd) ?? []));
    }
    return map;
  }, [weekDays, byDay]);

  return (
    <div className="overflow-x-auto rounded-sm border border-cc-border/80 bg-white">
      <div className="min-w-[52rem]">
        <div className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] border-b border-cc-border/60 bg-cc-surface/30">
          <div className="border-r border-cc-border/50" aria-hidden />
          {weekDays.map((ymd) => {
            const dayEvents = byDay.get(ymd) ?? [];
            const today = isTodayOperational(ymd);

            return (
              <header
                key={ymd}
                className={`border-l border-cc-border/50 px-2 py-2 ${
                  today ? "bg-cc-surface/50" : ""
                }`}
              >
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.06em] ${
                    today ? "text-cc-deep" : "text-cc-muted"
                  }`}
                >
                  {formatCalendarDayHeader(ymd)}
                </p>
                <p
                  className={`mt-0.5 text-[10px] font-semibold tabular-nums ${
                    today ? "text-cc-deep" : "text-cc-muted"
                  }`}
                  aria-label={
                    dayEvents.length === 1
                      ? t("calendar.eventsCountOne")
                      : t("calendar.eventsCountMany", {
                          count: String(dayEvents.length),
                        })
                  }
                >
                  {t("calendar.dayEventCount", {
                    count: String(dayEvents.length),
                  })}
                </p>
              </header>
            );
          })}
        </div>

        <ol className="divide-y divide-cc-border/60">
          {VISITA_SLOTS_HORARIOS.map((slot) => (
            <li
              key={slot}
              className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))]"
            >
              <time
                dateTime={labelYmd ? `${labelYmd}T${slot}` : undefined}
                className="border-r border-cc-border/50 px-2 py-2 text-right text-[10px] font-semibold tabular-nums text-cc-muted sm:text-xs"
              >
                {labelYmd ? formatAgendaSlotTimeLabel(labelYmd, slot) : slot}
              </time>
              {weekDays.map((ymd) => (
                <WeekDaySlotCell
                  key={`${ymd}-${slot}`}
                  ymd={ymd}
                  slot={slot}
                  slotEvents={eventosPorDiaSlot.get(ymd)?.get(slot) ?? []}
                  dragEnabled={dragEnabled}
                  draggingEventId={draggingEventId}
                  dragOverYmd={dragOverYmd}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                />
              ))}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
