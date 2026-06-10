"use client";

import { useState } from "react";

import { OsWorkspaceDetalhesSheet } from "@/components/ordens-servico/workspace/os-workspace-detalhes-sheet";
import { resumirEndereco } from "@/components/ordens-servico/workspace/os-workspace-utils";
import { t, tOsStage } from "@/lib/i18n";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import { clienteMapsUrl } from "@/lib/ordens-servico/visita-comercial";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
};

/** Resumo compacto — leitura rápida + ações de campo. */
export function OsWorkspaceResumo({ ordem }: Props) {
  const [detalhesOpen, setDetalhesOpen] = useState(false);
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
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm border border-cc-border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
              >
                {t("os.workspace.openRoute")}
              </a>
            ) : (
              <span
                className="rounded-sm border border-dashed border-cc-border px-2.5 py-1.5 text-[10px] text-cc-subtle"
                title={t("os.visit.noMaps")}
              >
                {t("os.workspace.openRoute")}
              </span>
            )}
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
    </>
  );
}
