"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { buscarDetalheOrdemServico } from "@/app/ordens-servico/actions";
import { OsBloqueioOperacionalBanner } from "@/components/ordens-servico/os-bloqueio-operacional-banner";
import { OsWorkspaceBloqueioOperacional } from "@/components/ordens-servico/workspace/os-workspace-bloqueio";
import { OsWorkspaceContextoOperacional } from "@/components/ordens-servico/workspace/os-workspace-contexto";
import { OsWorkspaceEtapa } from "@/components/ordens-servico/workspace/os-workspace-etapa";
import { OsWorkspaceResumo } from "@/components/ordens-servico/workspace/os-workspace-resumo";
import { OsWorkspaceTimeline } from "@/components/ordens-servico/workspace/os-workspace-timeline";
import { t, tOsStage } from "@/lib/i18n";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import { isOsAgendamentoVisita } from "@/lib/ordens-servico/visita-comercial";
import type { Equipe, OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
  equipes: Equipe[];
  viewerCanSeeFinancial?: boolean;
  backHref: string;
};

/**
 * Página operacional /os/[id] — workspace compacto de campo.
 */
export function OsWorkspacePage({
  ordem: initial,
  equipes,
  viewerCanSeeFinancial = false,
  backHref,
}: Props) {
  const router = useRouter();
  const [ordem, setOrdem] = useState(initial);
  const [, startTransition] = useTransition();

  const recarregar = useCallback(() => {
    startTransition(async () => {
      try {
        const { data, error } = await buscarDetalheOrdemServico(ordem.id);
        if (error) {
          console.error("buscarDetalheOrdemServico:", error);
          return;
        }
        if (data) setOrdem(data);
        router.refresh();
      } catch (e) {
        console.error("recarregar OS:", e);
      }
    });
  }, [ordem.id, router]);

  const voltarAoPainel = useCallback(() => {
    router.push(backHref);
    router.refresh();
  }, [backHref, router]);

  const etapaLabel = tOsStage(parseOsStage(ordem.etapa_atual));
  const agendamento = isOsAgendamentoVisita(ordem);
  const painelTitulo = agendamento
    ? t("os.visit.schedulingTitle")
    : `${t("os.panel.executionTitle")} — ${etapaLabel}`;

  return (
    <div className="space-y-2.5 pb-6">
      <Link
        href={backHref}
        className="inline-block text-[10px] font-medium uppercase tracking-[0.08em] text-cc-muted hover:text-cc-ink"
      >
        ← {t("os.workspace.back")}
      </Link>

      <OsBloqueioOperacionalBanner ordem={ordem} onAtualizado={recarregar} />

      <OsWorkspaceResumo ordem={ordem} />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:items-start lg:gap-4">
        {/* Coluna esquerda: contexto + histórico (ordem operacional) */}
        <div className="order-2 space-y-3 lg:order-1">
          <OsWorkspaceBloqueioOperacional ordem={ordem} onAtualizado={recarregar} />
          <OsWorkspaceContextoOperacional ordem={ordem} />
          <OsWorkspaceTimeline
            ordem={ordem}
            viewerCanSeeFinancial={viewerCanSeeFinancial}
          />
        </div>

        {/* Coluna direita: execução agora (prioridade) */}
        <section
          className="order-1 rounded-ds-lg border-2 border-cc-ink/10 bg-white p-3 shadow-lift sm:p-3.5 lg:order-2 lg:sticky lg:top-[3.5rem]"
          aria-label={t("os.panel.executionAria")}
        >
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-ink">
            {painelTitulo}
          </h2>
          <OsWorkspaceEtapa
            ordem={ordem}
            equipes={equipes}
            onAtualizado={recarregar}
            onConcluido={voltarAoPainel}
            viewerCanSeeFinancial={viewerCanSeeFinancial}
          />
        </section>
      </div>
    </div>
  );
}
