"use client";

import type { ReactNode } from "react";

import { OsBloqueioFluxoAviso } from "@/components/ordens-servico/os-bloqueio-fluxo-aviso";
import { OsWorkspaceCommercial } from "@/components/ordens-servico/workspace/os-workspace-commercial";
import { OsWorkspaceFinancial } from "@/components/ordens-servico/workspace/os-workspace-financial";
import { OsWorkspaceInstallation } from "@/components/ordens-servico/workspace/os-workspace-installation";
import { OsWorkspaceProject } from "@/components/ordens-servico/workspace/os-workspace-project";
import { OsWorkspaceScheduling } from "@/components/ordens-servico/workspace/os-workspace-scheduling";
import { t, tOsStage } from "@/lib/i18n";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import { isOsFluxoBloqueado } from "@/lib/ordens-servico/os-bloqueio-fluxo";
import { isOsAgendamentoVisita } from "@/lib/ordens-servico/visita-comercial";
import type { Equipe, OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
  equipes: Equipe[];
  onAtualizado: () => void;
  viewerCanSeeFinancial?: boolean;
};

/** Área operacional contextual por etapa_atual — página /os/[id]. */
export function OsWorkspaceEtapa({
  ordem,
  equipes,
  onAtualizado,
  viewerCanSeeFinancial = false,
}: Props) {
  const etapa = parseOsStage(ordem.etapa_atual);
  const fluxoBloqueado = isOsFluxoBloqueado(ordem);

  function comAvisoFluxo(conteudo: ReactNode) {
    return (
      <div className="space-y-3">
        {fluxoBloqueado ? <OsBloqueioFluxoAviso /> : null}
        {conteudo}
      </div>
    );
  }

  if (etapa === "commercial") {
    if (isOsAgendamentoVisita(ordem)) {
      return comAvisoFluxo(
        <OsWorkspaceScheduling
          ordem={ordem}
          equipes={equipes}
          fluxoBloqueado={fluxoBloqueado}
          onAgendado={onAtualizado}
        />,
      );
    }
    return comAvisoFluxo(
      <OsWorkspaceCommercial
        ordem={ordem}
        fluxoBloqueado={fluxoBloqueado}
        onAtualizado={onAtualizado}
      />,
    );
  }

  if (etapa === "financial_review") {
    return comAvisoFluxo(
      <OsWorkspaceFinancial
        ordem={ordem}
        fluxoBloqueado={fluxoBloqueado}
        onAtualizado={onAtualizado}
        viewerCanSeeFinancial={viewerCanSeeFinancial}
      />,
    );
  }

  if (etapa === "project") {
    return comAvisoFluxo(
      <OsWorkspaceProject
        ordem={ordem}
        equipes={equipes}
        fluxoBloqueado={fluxoBloqueado}
        onAtualizado={onAtualizado}
      />,
    );
  }

  if (etapa === "installation") {
    return comAvisoFluxo(
      <OsWorkspaceInstallation
        ordem={ordem}
        fluxoBloqueado={fluxoBloqueado}
        onAtualizado={onAtualizado}
      />,
    );
  }

  if (etapa === "completed") {
    return (
      <p className="py-6 text-center text-sm text-cc-muted">
        {t("os.workflow.pipelineDone")}
      </p>
    );
  }

  return (
    <p className="py-6 text-center text-sm font-light text-cc-muted">
      {t("os.panel.stageComingSoon")}
      <span className="mt-2 block font-medium text-cc-ink">
        {tOsStage(etapa)}
      </span>
    </p>
  );
}
