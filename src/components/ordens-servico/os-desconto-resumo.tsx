"use client";

import { t } from "@/lib/i18n";
import {
  descontoOrdemValor,
  ordemTemDesconto,
  valorContratadoLiquido,
} from "@/lib/ordens-servico/os-desconto";
import {
  formatOsValorUsd,
  valorContratadoEfetivo,
} from "@/lib/ordens-servico/os-valores-etapa";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

const sectionLabel =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted";

type Props = {
  ordem: OrdemServicoWithRelations;
  valorBrutoOverride?: number;
};

/** Resumo do desconto — não usar na etapa Instalação. */
export function OsDescontoResumo({ ordem, valorBrutoOverride }: Props) {
  if (!ordemTemDesconto(ordem)) return null;

  const bruto = valorBrutoOverride ?? valorContratadoEfetivo(ordem);
  const desconto = descontoOrdemValor(ordem);
  const liquido = valorContratadoLiquido(ordem, valorBrutoOverride);

  return (
    <section className="rounded-sm border border-amber-200/80 bg-amber-50/50 px-3 py-2.5">
      <p className={sectionLabel}>{t("os.desconto.resumoTitle")}</p>
      <div className="mt-2 space-y-1 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-cc-muted">{t("os.desconto.brutoLabel")}</span>
          <span className="tabular-nums text-cc-deep">{formatOsValorUsd(bruto)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-cc-muted">{t("os.desconto.descontoLabel")}</span>
          <span className="tabular-nums font-medium text-amber-800">
            −{formatOsValorUsd(desconto)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-amber-200/60 pt-1">
          <span className="font-medium text-cc-ink">{t("os.desconto.liquidoLabel")}</span>
          <span className="tabular-nums font-semibold text-cc-ink">
            {formatOsValorUsd(liquido)}
          </span>
        </div>
        {ordem.desconto_justificativa?.trim() ? (
          <p className="pt-1 text-xs font-light leading-relaxed text-cc-deep">
            {ordem.desconto_justificativa}
          </p>
        ) : null}
      </div>
    </section>
  );
}
