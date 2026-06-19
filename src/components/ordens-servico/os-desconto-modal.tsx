"use client";

import { useEffect, useState, useTransition } from "react";

import { salvarDescontoOrdemServico } from "@/app/ordens-servico/desconto-actions";
import { OperationalModal } from "@/components/operacional/operational-modal";
import { Field } from "@/components/ui/field";
import { OsMoneyInput } from "@/components/ordens-servico/os-valores-etapa-fields";
import { t } from "@/lib/i18n";
import { formatOsValorUsd } from "@/lib/ordens-servico/os-valores-etapa";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

const textareaClass =
  "mt-1 w-full min-h-[96px] resize-y rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

type Props = {
  ordem: OrdemServicoWithRelations;
  open: boolean;
  onClose: () => void;
  onSalvo: () => void;
};

export function OsDescontoModal({ ordem, open, onClose, onSalvo }: Props) {
  const [valor, setValor] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setValor(
      ordem.desconto_valor != null ? formatOsValorUsd(ordem.desconto_valor) : "",
    );
    setJustificativa(ordem.desconto_justificativa ?? "");
    setMsg(null);
  }, [
    open,
    ordem.id,
    ordem.desconto_valor,
    ordem.desconto_justificativa,
  ]);

  function salvar() {
    startTransition(async () => {
      setMsg(null);
      const r = await salvarDescontoOrdemServico(
        ordem.id,
        valor,
        justificativa,
      );
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      onSalvo();
      onClose();
    });
  }

  return (
    <OperationalModal
      open={open}
      onClose={onClose}
      title={t("os.desconto.modalTitle")}
      wide
    >
      <p className="mb-4 text-sm font-light text-cc-muted">
        {t("os.desconto.modalHint")}
      </p>

      <div className="space-y-4">
        <Field label={t("os.desconto.valorLabel")}>
          <OsMoneyInput value={valor} disabled={pending} onChange={setValor} />
        </Field>

        <Field label={t("os.desconto.justificativaLabel")}>
          <textarea
            disabled={pending}
            className={textareaClass}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder={t("os.desconto.justificativaPlaceholder")}
          />
        </Field>

        {msg ? (
          <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
            {msg}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-sm px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted hover:bg-cc-border-light"
          >
            {t("os.desconto.cancel")}
          </button>
          <button
            type="button"
            disabled={pending || !valor.trim() || !justificativa.trim()}
            onClick={salvar}
            className="rounded-sm bg-cc-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-cc-deep disabled:opacity-40"
          >
            {pending ? t("os.desconto.saving") : t("os.desconto.save")}
          </button>
        </div>
      </div>
    </OperationalModal>
  );
}
