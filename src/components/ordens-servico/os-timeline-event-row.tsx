"use client";

import { formatTimelineDateTime } from "@/lib/ordens-servico/datetime";
import { t } from "@/lib/i18n";
import type { TimelineItem } from "@/lib/ordens-servico/timeline";

type Props = {
  item: TimelineItem;
  /** card = painel operacional legado; compact = histórico completo */
  variant?: "compact" | "card";
};

function TimelineDates({ item }: { item: TimelineItem }) {
  return (
    <div className="mt-2 space-y-0.5">
      <p className="text-xs text-cc-muted">
        {t("os.timeline.registeredAt")}:{" "}
        {formatTimelineDateTime(item.registradoEm)}
      </p>
      {item.dataVisita ? (
        <p className="text-xs text-cc-muted">
          {t("os.timeline.visitDate")}: {item.dataVisita}
        </p>
      ) : null}
    </div>
  );
}

export function OsTimelineEventRow({ item, variant = "compact" }: Props) {
  const cor = item.equipe?.cor_primaria ?? "#7189a8";

  if (variant === "card") {
    return (
      <li className="relative pl-8">
        <span
          className="absolute left-0 top-3 h-3 w-3 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: cor }}
          aria-hidden
        />
        <article className="rounded-ds-lg border border-cc-border/80 bg-cc-surface/90 px-3 py-2.5 shadow-sheet">
          <p className="text-sm font-medium text-cc-ink">{item.titulo}</p>
          {item.contexto ? (
            <p className="mt-1 text-sm font-light leading-snug text-cc-deep">
              {item.contexto}
            </p>
          ) : null}
          <TimelineDates item={item} />
          {item.equipeLabel ? (
            <p className="mt-0.5 text-xs font-medium text-cc-deep">
              {item.equipeLabel}
            </p>
          ) : null}
        </article>
      </li>
    );
  }

  return (
    <li className="relative pl-6">
      <span
        className="absolute left-0 top-2.5 h-2 w-2 rounded-full border border-white"
        style={{ backgroundColor: cor }}
        aria-hidden
      />
      <article className="border-b border-cc-border/50 py-3 last:border-0">
        <p className="text-sm font-medium text-cc-ink">{item.titulo}</p>
        {item.contexto ? (
          <p className="mt-0.5 text-sm font-light text-cc-deep">{item.contexto}</p>
        ) : null}
        <TimelineDates item={item} />
        {item.equipeLabel ? (
          <p className="mt-0.5 text-xs font-medium text-cc-deep">
            {item.equipeLabel}
          </p>
        ) : null}
      </article>
    </li>
  );
}
