"use client";

import type { DragEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import {
  CALENDAR_DRAG_MIME,
  formatCalendarEventTime,
  type CalendarEvento,
} from "@/lib/calendar/operational-calendar";
import { t, tEventStatus, tEventType } from "@/lib/i18n";
import { osWorkspacePath } from "@/lib/ordens-servico/os-routes";
import { equipeCardSurfaceStyles } from "@/lib/ui/equipe-color";

type Props = {
  ev: CalendarEvento;
  sourceYmd: string;
  variant?: "compact" | "expanded";
  dragEnabled: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
};

function DetailRow({
  label,
  value,
  prominent = false,
}: {
  label: string;
  value: string;
  prominent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-subtle">
        {label}
      </dt>
      <dd
        className={`mt-0.5 truncate ${
          prominent
            ? "text-base font-medium text-cc-ink sm:text-lg"
            : "text-sm font-light text-cc-deep"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

export function CalendarEventCard({
  ev,
  sourceYmd,
  variant = "compact",
  dragEnabled,
  isDragging,
  onDragStart,
  onDragEnd,
}: Props) {
  const router = useRouter();
  const skipClickRef = useRef(false);

  function openOs() {
    router.push(osWorkspacePath(ev.ordem_servico_id));
  }

  const interactiveProps = {
    draggable: dragEnabled,
    onDragStart: (event: DragEvent) => {
      if (!dragEnabled) {
        event.preventDefault();
        return;
      }
      skipClickRef.current = true;
      event.dataTransfer.setData(
        CALENDAR_DRAG_MIME,
        JSON.stringify({ eventId: ev.id, sourceYmd }),
      );
      event.dataTransfer.effectAllowed = "move";
      onDragStart();
    },
    onDragEnd: () => {
      onDragEnd();
      window.setTimeout(() => {
        skipClickRef.current = false;
      }, 0);
    },
    onClick: () => {
      if (skipClickRef.current) return;
      openOs();
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openOs();
      }
    },
    role: "link" as const,
    tabIndex: 0,
  };

  const surfaceClass = `block rounded-sm border border-cc-border/70 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cc-blue-focus ${
    dragEnabled ? "lg:cursor-grab lg:active:cursor-grabbing" : "cursor-pointer"
  } ${isDragging ? "opacity-40" : ""}`;

  if (variant === "expanded") {
    return (
      <div
        {...interactiveProps}
        className={`${surfaceClass} p-4 sm:p-5`}
        style={equipeCardSurfaceStyles(ev.equipe_cor, ev.equipe_cor_secundaria)}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-xl font-semibold tabular-nums text-cc-ink sm:text-2xl">
            {formatCalendarEventTime(ev.startIso)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {ev.is_repair ? (
              <span className="rounded-sm bg-violet-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                {t("calendar.repairBadge")}
              </span>
            ) : null}
            <span className="rounded-sm border border-cc-border/60 bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep">
              {tEventStatus(ev.status)}
            </span>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailRow
            label={t("calendar.fieldClient")}
            value={ev.cliente_nome}
            prominent
          />
          <DetailRow label={t("calendar.fieldTeam")} value={ev.equipe_nome} />
          <DetailRow
            label={t("calendar.fieldType")}
            value={tEventType(ev.tipo_evento)}
          />
          <DetailRow
            label={t("calendar.fieldStatus")}
            value={tEventStatus(ev.status)}
          />
        </dl>
      </div>
    );
  }

  return (
    <div
      {...interactiveProps}
      className={`${surfaceClass} p-2`}
      style={equipeCardSurfaceStyles(ev.equipe_cor, ev.equipe_cor_secundaria)}
    >
      <p className="text-[11px] font-semibold tabular-nums text-cc-deep">
        {formatCalendarEventTime(ev.startIso)}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium text-cc-ink">
        {ev.cliente_nome}
      </p>
      {ev.is_repair ? (
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
          {t("calendar.repairBadge")}
        </p>
      ) : null}
      <p className="mt-1 truncate text-[11px] text-cc-muted">{ev.equipe_nome}</p>
      <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.06em] text-cc-subtle">
        {tEventType(ev.tipo_evento)}
      </p>
    </div>
  );
}
