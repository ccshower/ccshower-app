"use client";

import type { ReactNode } from "react";

import { OsOpenRouteButton } from "@/components/ordens-servico/workspace/os-open-route-button";
import { formatOperacionalVisita } from "@/lib/ordens-servico/datetime";
import {
  labelOperationalStatus,
  parseOsStage,
} from "@/lib/ordens-servico/operacional-snapshot";
import { t, tClientType, tOsStage } from "@/lib/i18n";
import { parseClientType } from "@/lib/clientes/tipo-cliente";
import { clienteMapsUrl } from "@/lib/ordens-servico/visita-comercial";
import { formatResponsavelAuxiliar } from "@/lib/ordens-servico/responsavel-equipe";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

function ResumoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-cc-border/50 py-2 last:border-0">
      <dt className="shrink-0 text-[11px] font-medium text-cc-muted">{label}</dt>
      <dd
        className={`min-w-0 text-right text-sm ${highlight ? "font-medium text-cc-ink" : "font-light text-cc-deep"}`}
      >
        {value}
      </dd>
    </div>
  );
}

type Props = {
  ordem: OrdemServicoWithRelations;
};

/** Bloco 1 — somente leitura, compacto, sem inputs. */
export function OsResumoOperacional({ ordem }: Props) {
  const maps = clienteMapsUrl(ordem.cliente);
  const cor = ordem.equipe?.cor_primaria ?? "#7189a8";
  const tipo =
    ordem.cliente?.tipo_cliente != null
      ? tClientType(parseClientType(ordem.cliente.tipo_cliente))
      : "—";
  const etapa = tOsStage(parseOsStage(ordem.etapa_atual));
  const status = labelOperationalStatus(ordem.status_atual);

  return (
    <section
      className="rounded-ds-lg border border-cc-border bg-cc-surface px-3 py-1 shadow-sheet"
      aria-label={t("os.panel.summaryAria")}
    >
      <h2 className="px-1 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted">
        {t("os.panel.summaryTitle")}
      </h2>

      <dl className="px-1 pb-2">
        <ResumoRow label="Customer" value={ordem.cliente?.nome ?? "—"} highlight />
        <ResumoRow label="Type" value={tipo} />
        <ResumoRow
          label="Phone"
          value={
            ordem.cliente?.telefone ? (
              <a href={`tel:${ordem.cliente.telefone}`} className="text-cc-blue-deep">
                {ordem.cliente.telefone}
              </a>
            ) : (
              "—"
            )
          }
        />
        <ResumoRow
          label="Address"
          value={
            <span className="block max-w-[14rem] truncate sm:max-w-[18rem]">
              {ordem.cliente?.endereco_formatado ?? "—"}
            </span>
          }
        />
        <ResumoRow
          label="Visit"
          value={formatOperacionalVisita(ordem.visita_inicial?.data_inicio)}
          highlight
        />
        <ResumoRow
          label="Team"
          value={
            ordem.equipe ? (
              <span className="inline-flex items-center justify-end gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: cor }}
                  aria-hidden
                />
                {ordem.equipe.nome}
              </span>
            ) : (
              "—"
            )
          }
        />
        <ResumoRow
          label="Reference (optional)"
          value={formatResponsavelAuxiliar(ordem.responsavel?.nome)}
        />
        <ResumoRow label="Stage" value={etapa} highlight />
        <ResumoRow label="Status" value={status} highlight />
      </dl>

      <div className="border-t border-cc-border/60 px-1 py-3">
        <OsOpenRouteButton
          ordemId={ordem.id}
          etapaAtual={ordem.etapa_atual}
          fallbackMapsUrl={maps}
        />
      </div>
    </section>
  );
}
