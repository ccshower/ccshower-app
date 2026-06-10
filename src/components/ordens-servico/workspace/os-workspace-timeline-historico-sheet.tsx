"use client";

import { useMemo } from "react";

import { OsOperacionalSheet } from "@/components/ordens-servico/os-operacional-sheet";
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
  open: boolean;
  onClose: () => void;
};

/** Histórico completo da OS — drawer lateral, ordem cronológica. */
export function OsWorkspaceTimelineHistoricoSheet({
  ordem,
  viewerCanSeeFinancial = false,
  open,
  onClose,
}: Props) {
  const itens = useMemo(
    () =>
      buildTimelineCronologica(
        timelineBuildInputFromOrdem(ordem, { viewerCanSeeFinancial }),
      ),
    [ordem, viewerCanSeeFinancial],
  );

  const titulo = `${t("os.workspace.fullHistoryTitle")} — ${ordem.cliente?.nome ?? ordem.titulo}`;

  return (
    <OsOperacionalSheet open={open} onClose={onClose} ariaLabel={titulo}>
      <div className="space-y-3">
        <header>
          <h2 className="font-display text-lg font-light text-cc-ink">
            {t("os.workspace.fullHistoryTitle")}
          </h2>
          <p className="mt-1 text-xs font-light text-cc-muted">
            {t("os.timeline.subtitle")}
          </p>
        </header>

        {itens.length === 0 ? (
          <p className="py-6 text-center text-sm text-cc-muted">
            {t("os.timeline.empty")}
          </p>
        ) : (
          <ul className="relative before:absolute before:bottom-1 before:left-[3px] before:top-1 before:w-px before:bg-cc-border">
            {itens.map((item) => (
              <OsTimelineEventRow key={item.id} item={item} />
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-sm border border-cc-border py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted hover:bg-cc-border-light"
        >
          {t("os.panel.close")}
        </button>
      </div>
    </OsOperacionalSheet>
  );
}
