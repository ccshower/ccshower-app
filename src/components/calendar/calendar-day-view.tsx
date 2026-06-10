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

      <ul
        className={`min-h-[12rem] space-y-3 p-3 sm:space-y-4 sm:p-4 transition-colors ${
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
        {eventos.length === 0 ? (
          <li className="rounded-sm border border-dashed border-cc-border/70 px-4 py-12 text-center text-sm font-light text-cc-subtle">
            {t("calendar.noEvents")}
          </li>
        ) : (
          eventos.map((ev) => (
            <li key={ev.id}>
              <CalendarEventCard
                ev={ev}
                sourceYmd={ymd}
                variant="expanded"
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
}
