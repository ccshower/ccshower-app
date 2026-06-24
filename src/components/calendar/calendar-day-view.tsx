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
import { VISITA_SLOTS_HORARIOS } from "@/lib/ordens-servico/visita-slots";

type Props = {
  ymd: string;
  eventos: CalendarEvento[];
  dragEnabled: boolean;
  draggingEventId: string | null;
  dragOverYmd: string | null;
  onDragStart: (eventId: string) => void;
  onDragEnd: () => void;
  onDragOver: (ymd: string) => void;
  onDragLeave: (ymd: string) => void;
  onDrop: (ymd: string, rawPayload: string) => void;
};

export function CalendarDayView({
  ymd,
  eventos,
  dragEnabled,
  draggingEventId,
  dragOverYmd,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: Props) {
  const today = isTodayOperational(ymd);
  const isDropTarget = dragOverYmd === ymd && draggingEventId != null;
  const eventosPorSlot = useMemo(
    () => groupCalendarEventosByAgendaSlot(eventos),
    [eventos],
  );

  return (
    <section
      className={`w-full rounded-sm border bg-white ${
        today ? "border-cc-deep/40 ring-1 ring-cc-deep/10" : "border-cc-border/80"
      } ${isDropTarget ? "ring-2 ring-cc-blue-focus/30" : ""}`}
    >
      <header
        className={`border-b px-4 py-3 sm:px-5 ${
          today ? "border-cc-deep/20 bg-cc-surface/50" : "border-cc-border/60 bg-cc-surface/30"
        }`}
      >
        <p
          className={`text-xs font-semibold uppercase tracking-[0.08em] ${
            today ? "text-cc-deep" : "text-cc-muted"
          }`}
        >
          {formatCalendarDayHeader(ymd)}
        </p>
        <p
          className={`mt-1 text-sm tabular-nums ${
            today ? "font-medium text-cc-deep" : "font-light text-cc-muted"
          }`}
        >
          {eventos.length === 1
            ? t("calendar.eventsCountOne")
            : t("calendar.eventsCountMany", { count: String(eventos.length) })}
        </p>
      </header>

      <div
        className={`transition-colors ${isDropTarget ? "bg-cc-border-light/40" : ""}`}
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
        <ol className="divide-y divide-cc-border/60">
          {VISITA_SLOTS_HORARIOS.map((slot) => {
            const slotEvents = eventosPorSlot.get(slot) ?? [];
            const slotLabel = formatAgendaSlotTimeLabel(ymd, slot);

            return (
              <li
                key={slot}
                className="flex min-h-[3.25rem] gap-3 px-3 py-2 sm:gap-4 sm:px-4 sm:py-2.5"
              >
                <time
                  dateTime={`${ymd}T${slot}`}
                  className="w-[4.5rem] shrink-0 pt-0.5 text-right text-xs font-semibold tabular-nums text-cc-muted sm:w-20"
                >
                  {slotLabel}
                </time>
                <div className="min-w-0 flex-1 space-y-2">
                  {slotEvents.length === 0 ? (
                    <div
                      className="min-h-8 rounded-sm border border-dashed border-cc-border/50 bg-cc-surface/20"
                      aria-label={t("calendar.openSlot")}
                    />
                  ) : (
                    slotEvents.map((ev) => (
                      <CalendarEventCard
                        key={ev.id}
                        ev={ev}
                        sourceYmd={ymd}
                        variant="expanded"
                        dragEnabled={dragEnabled}
                        isDragging={draggingEventId === ev.id}
                        onDragStart={() => onDragStart(ev.id)}
                        onDragEnd={onDragEnd}
                      />
                    ))
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
