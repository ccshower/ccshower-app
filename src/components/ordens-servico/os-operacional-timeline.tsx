"use client";

import { useMemo } from "react";

import { OsTimelineEventRow } from "@/components/ordens-servico/os-timeline-event-row";
import { t } from "@/lib/i18n";
import {
  buildTimelineCronologica,
  timelineBuildInputFromOrdem,
} from "@/lib/ordens-servico/timeline";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
  viewerCanSeeFinancial?: boolean;
  /** Dentro do painel OS — sem cabeçalho duplicado */
  embedded?: boolean;
  /** Bloco 2 — visual mais discreto */
  subdued?: boolean;
};

export function OsOperacionalTimeline({
  ordem,
  viewerCanSeeFinancial = false,
  embedded = false,
  subdued = false,
}: Props) {
  const itens = useMemo(
    () =>
      buildTimelineCronologica(
        timelineBuildInputFromOrdem(ordem, { viewerCanSeeFinancial }),
      ),
    [ordem, viewerCanSeeFinancial],
  );

  return (
    <section
      className={
        embedded
          ? subdued
            ? "pt-2"
            : "pt-1"
          : "border-t border-cc-border-light pt-4"
      }
    >
      {!embedded ? (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
            {t("os.timeline.title")}
          </h3>
          <p className="mt-1 text-xs font-light text-cc-muted">
            {t("os.timeline.subtitle")}
          </p>
        </>
      ) : !subdued ? (
        <p className="pb-2 text-[11px] font-light text-cc-subtle">
          {t("os.timeline.subtitle")}
        </p>
      ) : null}

      {itens.length === 0 ? (
        <p className="mt-3 text-sm text-cc-muted">{t("os.timeline.empty")}</p>
      ) : (
        <ul
          className={`relative space-y-3 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-0.5 before:bg-cc-border/80 ${
            embedded ? "mt-1" : "mt-4"
          }`}
        >
          {itens.map((item) => (
            <OsTimelineEventRow
              key={item.id}
              item={item}
              variant={subdued ? "compact" : "card"}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
