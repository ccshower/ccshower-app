"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { CalendarEquipeOption } from "@/lib/calendar/calendar-equipe-filter";
import { t } from "@/lib/i18n";

const ALL_TEAMS_DOT = "#c8d0dc";

const triggerClass =
  "flex w-full items-center gap-2 rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2 text-left text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus";

const optionClass =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-light text-cc-ink hover:bg-cc-border-light";

function EquipeColorDot({ color }: { color: string }) {
  return (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

type Props = {
  equipes: CalendarEquipeOption[];
  selectedEquipeId: string | null;
  onChange: (equipeId: string) => void;
};

export function CalendarEquipeFilterSelect({
  equipes,
  selectedEquipeId,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = equipes.find((eq) => eq.id === selectedEquipeId) ?? null;
  const triggerLabel = selected?.nome ?? t("calendar.allTeams");
  const triggerColor = selected?.cor_primaria ?? ALL_TEAMS_DOT;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function pick(equipeId: string) {
    setOpen(false);
    onChange(equipeId);
  }

  return (
    <div ref={rootRef} className="relative min-w-[10rem]">
      <button
        type="button"
        className={triggerClass}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("calendar.filterTeam")}
        onClick={() => setOpen((value) => !value)}
      >
        <EquipeColorDot color={triggerColor} />
        <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
        <span className="shrink-0 text-[10px] text-cc-subtle" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("calendar.filterTeam")}
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-cc-border bg-white py-1 shadow-lift"
        >
          <li role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={!selectedEquipeId}
              className={`${optionClass} ${!selectedEquipeId ? "bg-cc-border-light/60" : ""}`}
              onClick={() => pick("")}
            >
              <EquipeColorDot color={ALL_TEAMS_DOT} />
              <span className="truncate">{t("calendar.allTeams")}</span>
            </button>
          </li>
          {equipes.map((eq) => {
            const isSelected = eq.id === selectedEquipeId;
            return (
              <li key={eq.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`${optionClass} ${isSelected ? "bg-cc-border-light/60" : ""}`}
                  onClick={() => pick(eq.id)}
                >
                  <EquipeColorDot color={eq.cor_primaria} />
                  <span className="truncate">{eq.nome}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
