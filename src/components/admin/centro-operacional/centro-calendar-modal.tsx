"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { fetchCalendarWorkspace } from "@/app/calendar/actions";
import {
  CalendarClient,
  type CalendarNavigateQuery,
} from "@/app/calendar/calendar-client";
import type {
  CalendarWorkspaceQuery,
  CalendarWorkspaceState,
} from "@/lib/calendar/resolve-calendar-workspace";

function toWorkspaceQuery(next: CalendarNavigateQuery): CalendarWorkspaceQuery {
  return {
    vista: next.vista,
    dia: next.dia,
    semana: next.semana,
    mes: next.mes,
    equipe: next.equipe ?? undefined,
  };
}

export function CentroCalendarModal({
  open,
  onClose,
  unidadeId,
  unidadeNome,
}: {
  open: boolean;
  onClose: () => void;
  unidadeId: string | null;
  unidadeNome: string | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState<CalendarWorkspaceQuery>({});
  const [state, setState] = useState<CalendarWorkspaceState | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  const load = useCallback(
    (q: CalendarWorkspaceQuery) => {
      startTransition(async () => {
        const next = await fetchCalendarWorkspace(q, unidadeId);
        setState(next);
      });
    },
    [unidadeId],
  );

  useEffect(() => {
    if (!open) return;
    setState(null);
    setQuery({});
    load({});
  }, [open, load]);

  const navigate = useCallback(
    (next: CalendarNavigateQuery) => {
      const q = toWorkspaceQuery(next);
      setQuery(q);
      load(q);
    },
    [load],
  );

  const refresh = useCallback(() => {
    load(query);
  }, [load, query]);

  return (
    <dialog
      ref={ref}
      className="w-[calc(100%-1.5rem)] max-w-6xl rounded-ds-lg border border-cc-border bg-cc-surface p-0 text-base font-light shadow-lift backdrop:bg-black/40 backdrop:backdrop-blur-[2px] open:animate-none"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="flex items-center justify-between border-b border-cc-border px-5 py-3.5">
        <h2 className="font-display text-lg font-light tracking-tight text-cc-ink">
          Calendar
          {unidadeNome ? (
            <span className="text-cc-muted"> — {unidadeNome}</span>
          ) : null}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-ds p-1.5 text-cc-muted transition-colors hover:bg-cc-canvas hover:text-cc-ink"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div
        className={`max-h-[78vh] overflow-y-auto px-5 py-4 transition-opacity ${
          isPending ? "opacity-60" : ""
        }`}
      >
        {!state ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-cc-muted">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cc-blue" />
            Loading…
          </div>
        ) : (
          <>
            {state.error ? (
              <p className="mb-3 rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm font-medium text-cc-red">
                Error loading calendar: {state.error}
              </p>
            ) : null}
            <CalendarClient
              view={state.view}
              anchorDayYmd={state.anchorDayYmd}
              anchorMonthYmd={state.anchorMonthYmd}
              initialMondayYmd={state.initialMondayYmd}
              eventos={state.eventos}
              equipes={state.equipes}
              selectedEquipeId={state.selectedEquipeId}
              canFilterEquipes={state.canFilterEquipes}
              embedded
              onEmbeddedNavigate={navigate}
              onEmbeddedRefresh={refresh}
            />
          </>
        )}
      </div>
    </dialog>
  );
}
