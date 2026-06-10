"use client";

import { type ReactNode, useState, useTransition } from "react";

import { agendarVisitaExistente } from "@/app/ordens-servico/actions";
import { AgendarVisitaForm } from "@/components/ordens-servico/agendar-visita-form";
import { OsBloqueioFluxoAviso } from "@/components/ordens-servico/os-bloqueio-fluxo-aviso";
import { OsEtapaCommercialExecucao } from "@/components/ordens-servico/os-etapa-commercial-execucao";
import { isOsFluxoBloqueado } from "@/lib/ordens-servico/os-bloqueio-fluxo";
import { t, tOsStage } from "@/lib/i18n";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import { isOsAgendamentoVisita } from "@/lib/ordens-servico/visita-comercial";
import type { OsWorkflowStage } from "@/lib/ordens-servico/workflow";
import type { Equipe, OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
  equipes?: Equipe[];
  onAtualizado?: () => void;
};

function PlaceholderEtapa({ etapa }: { etapa: OsWorkflowStage }) {
  return (
    <section
      className="rounded-ds-lg border border-dashed border-cc-border bg-cc-border-light/40 px-4 py-8 text-center"
      aria-label={t("os.panel.executionAria")}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
        {t("os.panel.executionTitle")}
      </p>
      <p className="mt-2 font-display text-lg font-light text-cc-ink">
        {tOsStage(etapa)}
      </p>
      <p className="mt-2 text-sm font-light text-cc-muted">
        {t("os.panel.stageComingSoon")}
      </p>
    </section>
  );
}

function comAvisoFluxo(fluxoBloqueado: boolean, conteudo: ReactNode) {
  return (
    <div className="space-y-3">
      {fluxoBloqueado ? <OsBloqueioFluxoAviso /> : null}
      {conteudo}
    </div>
  );
}

/** Bloco 3 — painel contextual conforme etapa_atual (máquina de estados). */
export function OsEtapaExecucao({ ordem, equipes = [], onAtualizado }: Props) {
  const etapa = parseOsStage(ordem.etapa_atual);
  const fluxoBloqueado = isOsFluxoBloqueado(ordem);

  if (etapa === "completed") {
    return (
      <section className="rounded-ds-lg border border-emerald-200 bg-emerald-50/80 px-4 py-6 text-center">
        <p className="text-sm font-medium text-emerald-900">
          {t("os.workflow.pipelineDone")}
        </p>
      </section>
    );
  }

  if (etapa === "commercial") {
    if (isOsAgendamentoVisita(ordem)) {
      return comAvisoFluxo(
        fluxoBloqueado,
        <OsEtapaAgendamentoVisita
          ordem={ordem}
          equipes={equipes}
          fluxoBloqueado={fluxoBloqueado}
          onAgendado={onAtualizado}
        />,
      );
    }
    return comAvisoFluxo(
      fluxoBloqueado,
      <OsEtapaCommercialExecucao
        ordem={ordem}
        fluxoBloqueado={fluxoBloqueado}
        onConcluida={onAtualizado}
      />,
    );
  }

  return <PlaceholderEtapa etapa={etapa} />;
}

function OsEtapaAgendamentoVisita({
  ordem,
  equipes,
  fluxoBloqueado = false,
  onAgendado,
}: {
  ordem: OrdemServicoWithRelations;
  equipes: Equipe[];
  fluxoBloqueado?: boolean;
  onAgendado?: () => void;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cliente = ordem.cliente;

  if (!cliente) {
    return (
      <p className="py-6 text-center text-sm text-cc-red">
        Client not found for this work order.
      </p>
    );
  }

  const defaultEquipeId =
    ordem.equipe_atual_id ?? ordem.equipe_id ?? null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
          {t("os.visit.schedulingTitle")}
        </p>
        <p className="mt-1 text-sm font-light text-cc-muted">
          {t("os.visit.schedulingSubtitle")}
        </p>
      </div>

      <AgendarVisitaForm
        osId={ordem.id}
        etapa={parseOsStage(ordem.etapa_atual)}
        clienteId={cliente.id}
        clienteNome={cliente.nome}
        tipoCliente={cliente.tipo_cliente}
        equipes={equipes}
        defaultEquipeId={defaultEquipeId}
        initialEquipeId={defaultEquipeId}
        pending={pending}
        fluxoBloqueado={fluxoBloqueado}
        hideCancel
        onSubmit={(fd) => {
          startTransition(async () => {
            setMsg(null);
            const r = await agendarVisitaExistente(fd);
            if (!r.ok) {
              setMsg(r.message);
              return;
            }
            onAgendado?.();
          });
        }}
      />

      {msg ? (
        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
