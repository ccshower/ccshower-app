"use client";

import { useState } from "react";

import { OsClienteEditarPrimeiraVisita } from "@/components/ordens-servico/os-cliente-editar-primeira-visita";
import { OsDescontoModal } from "@/components/ordens-servico/os-desconto-modal";
import { OsWorkspaceDetalhesSheet } from "@/components/ordens-servico/workspace/os-workspace-detalhes-sheet";
import { OsOpenRouteButton } from "@/components/ordens-servico/workspace/os-open-route-button";
import { resumirEndereco } from "@/components/ordens-servico/workspace/os-workspace-utils";
import { t, tOsStage } from "@/lib/i18n";
import { ordemTemDesconto } from "@/lib/ordens-servico/os-desconto";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import { formatOsValorUsd } from "@/lib/ordens-servico/os-valores-etapa";
import { clienteMapsUrl } from "@/lib/ordens-servico/visita-comercial";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
  isAdmin?: boolean;
  googleMapsApiKey?: string;
  onAtualizado?: () => void;
};

function osPodeReceberDesconto(ordem: OrdemServicoWithRelations): boolean {
  return ordem.status !== "completed" && parseOsStage(ordem.etapa_atual) !== "completed";
}

/** Resumo compacto — leitura rápida + ações de campo. */
export function OsWorkspaceResumo({
  ordem,
  isAdmin = false,
  googleMapsApiKey,
  onAtualizado,
}: Props) {
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [descontoOpen, setDescontoOpen] = useState(false);
  const cor = ordem.equipe?.cor_primaria ?? "#7189a8";
  const mapsUrl = clienteMapsUrl(ordem.cliente);
  const etapa = tOsStage(parseOsStage(ordem.etapa_atual));

  return (
    <>
      <section
        className="rounded-ds-lg border border-cc-border/80 bg-white px-3 py-2.5 shadow-sheet sm:px-3.5"
        aria-label={t("os.panel.summaryAria")}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-light text-cc-ink sm:text-lg">
              {ordem.cliente?.nome ?? ordem.titulo}
            </p>
            <p className="mt-0.5 truncate text-xs font-light text-cc-muted">
              {resumirEndereco(ordem.cliente?.endereco_formatado)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
              <span className="font-medium text-cc-deep">{etapa}</span>
              {ordem.equipe ? (
                <span className="inline-flex items-center gap-1 text-cc-muted">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: cor }}
                    aria-hidden
                  />
                  {ordem.equipe.nome}
                </span>
              ) : null}
              {ordemTemDesconto(ordem) ? (
                <span className="rounded-ds bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                  {t("os.desconto.badge", {
                    amount: formatOsValorUsd(ordem.desconto_valor),
                  })}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <OsClienteEditarPrimeiraVisita
              ordem={ordem}
              googleMapsApiKey={googleMapsApiKey ?? ""}
              onSaved={() => onAtualizado?.()}
            />
            {isAdmin && osPodeReceberDesconto(ordem) ? (
              <button
                type="button"
                onClick={() => setDescontoOpen(true)}
                className="rounded-sm border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-900 hover:bg-amber-100"
              >
                {t("os.desconto.button")}
              </button>
            ) : null}
            <OsOpenRouteButton
              ordemId={ordem.id}
              etapaAtual={ordem.etapa_atual}
              fallbackMapsUrl={mapsUrl}
            />
            <button
              type="button"
              onClick={() => setDetalhesOpen(true)}
              className="rounded-sm bg-cc-ink px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-cc-deep"
            >
              {t("os.workspace.viewDetails")}
            </button>
          </div>
        </div>
      </section>

      <OsWorkspaceDetalhesSheet
        ordem={ordem}
        open={detalhesOpen}
        onClose={() => setDetalhesOpen(false)}
      />

      {isAdmin ? (
        <OsDescontoModal
          ordem={ordem}
          open={descontoOpen}
          onClose={() => setDescontoOpen(false)}
          onSalvo={() => onAtualizado?.()}
        />
      ) : null}
    </>
  );
}
