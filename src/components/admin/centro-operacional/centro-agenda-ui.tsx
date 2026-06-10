"use client";

import {
  CentroIcon,
  IconChevronRight,
} from "@/components/admin/centro-operacional/centro-operacional-icons";
import type {
  AgendaGlobalBadgeOperacional,
  AgendaGlobalData,
  AgendaGlobalEvento,
} from "@/lib/centro-operacional/agenda-global";
import { agendaTipoConfig } from "@/lib/mock/centro-operacional/operational-dashboard";

const agendaOperacionalBadgeConfig: Record<
  AgendaGlobalBadgeOperacional,
  { label: string; className: string }
> = {
  bloqueado: {
    label: "Blocked",
    className: "bg-cc-rose-soft text-cc-rose-deep",
  },
  atrasado: {
    label: "Overdue",
    className: "bg-amber-100 text-amber-700",
  },
  reagendado: {
    label: "Rescheduled",
    className: "bg-cc-blue-soft text-cc-blue-deep",
  },
  cancelado: {
    label: "Cancelled",
    className: "bg-cc-border-light text-cc-muted",
  },
};

export function AgendaRow(
  props: AgendaGlobalEvento & { last: boolean; compact?: boolean },
) {
  const {
    hora,
    tipo,
    cliente,
    equipe,
    endereco,
    badgeOperacional,
    temporal,
    last,
    compact = false,
  } = props;
  const tipoConf = agendaTipoConfig[tipo];
  const passado = temporal === "passado";
  const badge = badgeOperacional
    ? agendaOperacionalBadgeConfig[badgeOperacional]
    : null;

  return (
    <button
      type="button"
      className={`group flex w-full items-center text-left transition-colors hover:bg-cc-canvas ${
        compact ? "gap-2 px-3 py-2" : "gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4"
      } ${last ? "" : "border-b border-cc-border"}`}
    >
      <div className={compact ? "w-10 shrink-0" : "w-12 shrink-0 sm:w-14"}>
        <div
          className={`font-display font-light leading-none ${
            compact ? "text-base" : "text-lg sm:text-xl"
          } ${passado ? "text-cc-muted" : "text-cc-ink"}`}
        >
          {hora}
        </div>
      </div>
      <div
        className={`shrink-0 rounded-ds ${compact ? "p-1.5" : "p-2"} ${tipoConf.bg} ${
          passado ? "opacity-75" : ""
        }`}
      >
        <CentroIcon
          id={tipoConf.icon}
          className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} ${tipoConf.color}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-sm font-medium ${
              passado ? "text-cc-muted" : "text-cc-ink"
            }`}
          >
            {tipo}
          </span>
          {badge ? (
            <span
              className={`hidden shrink-0 rounded-ds px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:inline-flex ${badge.className}`}
            >
              {badge.label}
            </span>
          ) : null}
        </div>
        <div
          className={`mt-0.5 truncate text-xs ${
            passado ? "text-cc-subtle" : "text-cc-muted"
          }`}
        >
          {cliente} · {equipe}
        </div>
        {!compact ? (
          <div
            className={`hidden truncate text-[11px] sm:block ${
              passado ? "text-cc-subtle" : "text-cc-subtle"
            }`}
          >
            {endereco}
          </div>
        ) : null}
      </div>
      {!compact ? (
        <IconChevronRight
          className={`self-center group-hover:text-cc-muted ${
            passado ? "text-cc-border" : "text-cc-border-strong"
          }`}
        />
      ) : null}
    </button>
  );
}

export function AgendaGlobalResumo({
  contadores,
}: {
  contadores: AgendaGlobalData["hoje"]["contadores"];
}) {
  const items = [
    { emoji: "👥", label: "Visits", value: contadores.visitas },
    { emoji: "🔧", label: "Installations", value: contadores.instalacoes },
    { emoji: "📐", label: "Projects", value: contadores.projetos },
    { emoji: "💰", label: "Financial", value: contadores.financeiro },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-ds border border-cc-border bg-cc-canvas/60 px-3 py-2 text-center"
        >
          <div className="text-base leading-none">{item.emoji}</div>
          <div className="mt-1 font-display text-xl font-light text-cc-ink">{item.value}</div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-cc-muted">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AgendaTabSwitch<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; count: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex shrink-0 rounded-ds-lg border border-cc-border bg-cc-canvas p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-ds px-3 py-1.5 text-xs font-medium transition-all ${
            active === tab.id
              ? "bg-cc-surface text-cc-ink shadow-sheet"
              : "text-cc-muted hover:text-cc-deep"
          }`}
        >
          {tab.label}
          <span className="ml-1.5 text-[10px] tabular-nums opacity-60">{tab.count}</span>
        </button>
      ))}
    </div>
  );
}
