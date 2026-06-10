"use client";

import { CalendarEventCard } from "@/components/calendar/calendar-event-card";
import {
  CALENDAR_DRAG_MIME,
  formatCalendarDayHeader,
  isTodayOperational,
  type CalendarEvento,
} from "@/lib/calendar/operational-calendar";
import { t } from "@/lib/i18n";

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
  return (
    <div className="grid gap-3 lg:grid-cols-7">
      {weekDays.map((ymd) => {
        const dayEvents = byDay.get(ymd) ?? [];
        const today = isTodayOperational(ymd);
        const isDropTarget = dragOverYmd === ymd && draggingEventId != null;

        return (
          <section
            key={ymd}
            className={`min-h-[8rem] rounded-sm border bg-white ${
              today ? "border-cc-deep/40 ring-1 ring-cc-deep/10" : "border-cc-border/80"
            } ${isDropTarget ? "ring-2 ring-cc-blue-focus/30" : ""}`}
          >
            <header
              className={`border-b px-2.5 py-2 ${
                today ? "border-cc-deep/20 bg-cc-surface/50" : "border-cc-border/60 bg-cc-surface/30"
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
                className={`mt-0.5 text-[11px] font-semibold tabular-nums ${
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

            <ul
              className={`min-h-[5rem] space-y-2 p-2 transition-colors ${
                isDropTarget ? "bg-cc-border-light/40" : ""
              }`}
              onDragOver={(event) => {
                if (!dragEnabled || !draggingEventId) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                onDragOver(ymd);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node)) {
                  return;
                }
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
              {dayEvents.length === 0 ? (
                <li className="px-1 py-4 text-center text-[11px] text-cc-subtle">
                  {t("calendar.noEvents")}
                </li>
              ) : (
                dayEvents.map((ev) => (
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
                ))
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
