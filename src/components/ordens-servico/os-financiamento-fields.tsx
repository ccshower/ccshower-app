"use client";

import { useEffect, useState } from "react";

import { t } from "@/lib/i18n";
import {
  FORMAS_PAGAMENTO_OS,
  financiamentoFromOrdem,
  isFormaPagamentoFinanciamento,
  tFormaPagamentoOs,
  type FinanciamentoCapture,
  type FormaPagamentoOs,
} from "@/lib/ordens-servico/os-financiamento";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

const labelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.06em] text-cc-muted";

type Props = {
  ordem: OrdemServicoWithRelations;
  disabled?: boolean;
  value: FinanciamentoCapture;
  onChange: (next: FinanciamentoCapture) => void;
};

export function OsFinanciamentoFields({
  disabled = false,
  value,
  onChange,
  ordem,
}: Props) {
  const isFinancing = isFormaPagamentoFinanciamento(value.forma_pagamento);

  function patch(partial: Partial<FinanciamentoCapture>) {
    onChange({ ...value, ...partial });
  }

  function onFormaChange(next: string) {
    const forma = next as FormaPagamentoOs | "";
    if (forma && !isFormaPagamentoFinanciamento(forma)) {
      onChange({
        forma_pagamento: forma,
        banco_financiamento: "",
      });
      return;
    }
    onChange({
      forma_pagamento: forma,
      banco_financiamento: value.banco_financiamento,
    });
  }

  return (
    <section className="rounded-sm border border-cc-border/80 bg-cc-surface/40 p-3">
      <div>
        <label htmlFor={`forma-pag-${ordem.id}`} className={labelClass}>
          {t("os.financing.paymentFormLabel")}
        </label>
        <select
          id={`forma-pag-${ordem.id}`}
          disabled={disabled}
          className={`mt-1 ${inputClass}`}
          value={value.forma_pagamento}
          onChange={(e) => onFormaChange(e.target.value)}
        >
          <option value="">{t("os.visitPayment.selectMethod")}</option>
          {FORMAS_PAGAMENTO_OS.map((m) => (
            <option key={m} value={m}>
              {tFormaPagamentoOs(m)}
            </option>
          ))}
        </select>
      </div>

      {isFinancing ? (
        <div className="mt-3 border-t border-cc-border/60 pt-3">
          <p className="text-[11px] leading-snug text-cc-muted">
            {t("os.financing.hint")}
          </p>
          <div className="mt-3">
            <label htmlFor={`banco-fin-${ordem.id}`} className={labelClass}>
              {t("os.financing.bankLabel")}
            </label>
            <input
              id={`banco-fin-${ordem.id}`}
              type="text"
              disabled={disabled}
              className={`mt-1 ${inputClass}`}
              placeholder={t("os.financing.bankPlaceholder")}
              value={value.banco_financiamento}
              onChange={(e) => patch({ banco_financiamento: e.target.value })}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function useFinanciamentoState(ordem: OrdemServicoWithRelations) {
  const [capture, setCapture] = useState<FinanciamentoCapture>(() =>
    financiamentoFromOrdem(ordem),
  );

  useEffect(() => {
    setCapture(financiamentoFromOrdem(ordem));
  }, [ordem.id, ordem.forma_pagamento, ordem.banco_financiamento]);

  return [capture, setCapture] as const;
}
