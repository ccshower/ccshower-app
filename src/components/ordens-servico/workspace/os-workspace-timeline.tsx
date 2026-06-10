"use client";

import { useMemo, useState, type ReactNode } from "react";

import { OsWorkspaceTimelineHistoricoSheet } from "@/components/ordens-servico/workspace/os-workspace-timeline-historico-sheet";
import { formatWorkspaceDateTime } from "@/components/ordens-servico/workspace/os-workspace-utils";
import { t } from "@/lib/i18n";
import { labelOperationalStatus } from "@/lib/ordens-servico/operacional-snapshot";
import {
  buildTimelineCronologica,
  timelineBuildInputFromOrdem,
  ultimoTimelineItem,
} from "@/lib/ordens-servico/timeline";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
  viewerCanSeeFinancial?: boolean;
};

function CompactRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="shrink-0 font-medium text-cc-subtle">{label}</span>
      <span className="min-w-0 text-right font-light text-cc-ink">{children}</span>
    </div>
  );
}

/** Resumo + histórico completo cronológico. */
export function OsWorkspaceTimeline({
  ordem,
  viewerCanSeeFinancial = false,
}: Props) {
  const [historicoOpen, setHistoricoOpen] = useState(false);

  const timelineInput = useMemo(
    () =>
      timelineBuildInputFromOrdem(ordem, {
        viewerCanSeeFinancial,
      }),
    [ordem, viewerCanSeeFinancial],
  );

  const itens = useMemo(
    () => buildTimelineCronologica(timelineInput),
    [timelineInput],
  );

  const ultimo = ultimoTimelineItem(timelineInput);
  const quando = ultimo?.registradoEm ?? null;
  const equipeNome = ultimo?.equipe?.nome ?? "—";
  const cor = ultimo?.equipe?.cor_primaria ?? "#7189a8";
  const totalEventos = itens.length;
  const temMaisHistorico = totalEventos > 1;

  return (
    <>
      <section className="rounded-ds-lg border border-cc-border/60 bg-cc-border-light/25 px-3 py-2.5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
          {t("os.workspace.historyTitle")}
        </h2>

        <div className="mt-2 space-y-1.5">
          <CompactRow label={t("os.workspace.lastEvent")}>
            {ultimo?.titulo ?? t("os.workspace.noLastEvent")}
          </CompactRow>
          <CompactRow label={t("os.workspace.currentStatus")}>
            {labelOperationalStatus(ordem.status_atual)}
          </CompactRow>
          <CompactRow label={t("os.workspace.team")}>
            <span className="inline-flex items-center justify-end gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: cor }}
                aria-hidden
              />
              {equipeNome}
            </span>
          </CompactRow>
          <CompactRow label={t("os.workspace.when")}>
            {formatWorkspaceDateTime(quando)}
          </CompactRow>
        </div>

        {temMaisHistorico || totalEventos > 0 ? (
          <button
            type="button"
            onClick={() => setHistoricoOpen(true)}
            className="mt-2.5 w-full rounded-sm border border-cc-border bg-white py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
          >
            {t("os.workspace.viewFullHistory")}
            {totalEventos > 0 ? (
              <span className="ml-1 font-normal text-cc-muted">
                ({totalEventos})
              </span>
            ) : null}
          </button>
        ) : null}
      </section>

      <OsWorkspaceTimelineHistoricoSheet
        ordem={ordem}
        viewerCanSeeFinancial={viewerCanSeeFinancial}
        open={historicoOpen}
        onClose={() => setHistoricoOpen(false)}
      />
    </>
  );
}
