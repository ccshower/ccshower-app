"use client";

import { OsBloqueioOperacionalBanner } from "@/components/ordens-servico/os-bloqueio-operacional-banner";
import { OsEtapaExecucao } from "@/components/ordens-servico/os-etapa-execucao";
import { OsEtapaHero } from "@/components/ordens-servico/os-etapa-hero";
import { OsOperacionalTimeline } from "@/components/ordens-servico/os-operacional-timeline";
import { OsResumoOperacional } from "@/components/ordens-servico/os-resumo-operacional";
import { t } from "@/lib/i18n";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
  onAtualizado?: () => void;
};

function noop() {}

/**
 * Painel operacional da OS existente — 3 blocos oficiais:
 * 1 resumo · 2 timeline · 3 execução da etapa
 */
export function OsPainelOperacional({ ordem, onAtualizado }: Props) {
  return (
    <div className="space-y-5">
      <OsBloqueioOperacionalBanner
        ordem={ordem}
        onAtualizado={onAtualizado ?? noop}
      />
      <OsEtapaHero ordem={ordem} />

      {/* Bloco 1 */}
      <OsResumoOperacional ordem={ordem} />

      {/* Bloco 2 — histórico (menos destaque) */}
      <section
        className="rounded-ds-lg border border-cc-border/60 bg-cc-border-light/30 px-3 py-3"
        aria-labelledby={`timeline-${ordem.id}`}
      >
        <h2
          id={`timeline-${ordem.id}`}
          className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-subtle"
        >
          {t("os.timeline.title")}
        </h2>
        <OsOperacionalTimeline ordem={ordem} embedded subdued />
      </section>

      {/* Bloco 3 — ação principal */}
      <section
        className="rounded-ds-lg border-2 border-cc-ink/12 bg-white p-4 shadow-lift"
        aria-label={t("os.panel.executionAria")}
      >
        <OsEtapaExecucao ordem={ordem} onAtualizado={onAtualizado} />
      </section>
    </div>
  );
}
