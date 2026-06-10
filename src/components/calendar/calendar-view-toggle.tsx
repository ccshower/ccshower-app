"use client";



import { calendarHref, type CalendarViewMode } from "@/lib/calendar/operational-calendar";

import { t } from "@/lib/i18n";

import Link from "next/link";



type Props = {

  view: CalendarViewMode;

  diaYmd: string;

  mondayYmd: string;

  equipeId: string | null;

  /** Quando definido, troca de vista vira callback (uso embutido em modal). */
  onViewChange?: (mode: CalendarViewMode) => void;

};



const VIEW_LABELS: Record<CalendarViewMode, () => string> = {

  day: () => t("calendar.viewDay"),

  week: () => t("calendar.viewWeek"),

  month: () => t("calendar.viewMonth"),

};



export function CalendarViewToggle({

  view,

  diaYmd,

  mondayYmd,

  equipeId,

  onViewChange,

}: Props) {

  const modes: CalendarViewMode[] = ["day", "week", "month"];



  return (

    <nav

      className="inline-flex rounded-sm border border-cc-border bg-white p-0.5"

      aria-label="Visualização do calendário"

    >

      {modes.map((mode) => {

        const active = view === mode;

        const className = `rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition ${
          active
            ? "bg-cc-ink text-white shadow-sheet"
            : "text-cc-muted hover:bg-cc-border-light hover:text-cc-deep"
        }`;

        if (onViewChange) {
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onViewChange(mode)}
              className={className}
              aria-current={active ? "page" : undefined}
            >
              {VIEW_LABELS[mode]()}
            </button>
          );
        }

        const href = calendarHref({

          vista: mode,

          dia: mode === "day" ? diaYmd : undefined,

          semana: mode === "week" ? mondayYmd : undefined,

          equipe: equipeId,

        });



        return (

          <Link

            key={mode}

            href={href}

            className={className}

            aria-current={active ? "page" : undefined}

          >

            {VIEW_LABELS[mode]()}

          </Link>

        );

      })}

    </nav>

  );

}

