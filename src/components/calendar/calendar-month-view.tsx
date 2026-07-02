"use client";

import { CalendarEventCard } from "@/components/calendar/calendar-event-card";
import {
  eventDayYmd,
  formatCalendarMonthDayNumber,
  formatCalendarWeekdayShortLabels,
  groupEventsByDay,
  isSameOperationalMonth,
  isTodayOperational,
  monthGridDayYmds,
  type CalendarEvento,
} from "@/lib/calendar/operational-calendar";
import { t } from "@/lib/i18n";

const MAX_EVENTS_PER_CELL = 3;

type Props = {
  monthAnchorYmd: string;
  eventos: CalendarEvento[];
  onSelectDay: (ymd: string) => void;
};

export function CalendarMonthView({
  monthAnchorYmd,
  eventos,
  onSelectDay,
}: Props) {
  const gridDays = monthGridDayYmds(monthAnchorYmd);
  const weekdayLabels = formatCalendarWeekdayShortLabels(
    gridDays[0] ?? monthAnchorYmd,
  );
  const byDay = groupEventsByDay(eventos, gridDays);

  return (
    <div className="overflow-x-auto rounded-sm border border-cc-border/80 bg-white">
      <div className="min-w-[42rem]">
        <div className="grid grid-cols-7 border-b border-cc-border/60 bg-cc-surface/30">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="border-l border-cc-border/50 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-cc-muted first:border-l-0"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {gridDays.map((ymd) => {
            const dayEvents = byDay.get(ymd) ?? [];
            const inMonth = isSameOperationalMonth(ymd, monthAnchorYmd);
            const today = isTodayOperational(ymd);
            const visible = dayEvents.slice(0, MAX_EVENTS_PER_CELL);
            const overflow = dayEvents.length - visible.length;

            return (
              <div
                key={ymd}
                className={`min-h-[6.5rem] border-b border-l border-cc-border/50 p-1.5 first:border-l-0 ${
                  inMonth ? "bg-white" : "bg-cc-surface/40"
                } ${today ? "ring-1 ring-inset ring-cc-blue/30" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => onSelectDay(ymd)}
                  className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors hover:bg-cc-border-light ${
                    today
                      ? "bg-cc-ink text-white hover:bg-cc-deep"
                      : inMonth
                        ? "text-cc-deep"
                        : "text-cc-subtle"
                  }`}
                  aria-label={ymd}
                >
                  {formatCalendarMonthDayNumber(ymd)}
                </button>

                {dayEvents.length === 0 ? (
                  <p className="px-0.5 text-[10px] text-cc-subtle">
                    {t("calendar.noEvents")}
                  </p>
                ) : (
                  <ul className="space-y-0.5">
                    {visible.map((ev) => (
                      <li key={ev.id}>
                        <CalendarEventCard
                          ev={ev}
                          sourceYmd={eventDayYmd(ev.startIso) ?? ymd}
                          variant="compact"
                          dragEnabled={false}
                          isDragging={false}
                          onDragStart={() => {}}
                          onDragEnd={() => {}}
                        />
                      </li>
                    ))}
                    {overflow > 0 ? (
                      <li>
                        <button
                          type="button"
                          onClick={() => onSelectDay(ymd)}
                          className="w-full rounded-sm px-1 py-0.5 text-left text-[10px] font-semibold text-cc-blue hover:bg-cc-border-light"
                        >
                          {t("calendar.monthMoreEvents", {
                            count: String(overflow),
                          })}
                        </button>
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
