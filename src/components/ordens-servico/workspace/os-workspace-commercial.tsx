"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  finalizarVisitaComercial,
  salvarFormaPagamentoComercial,
  salvarValorComercial,
} from "@/app/ordens-servico/visita-comercial-actions";
import {
  OsClienteNomeVisitaField,
  persistirNomeClienteAntesFinalizarVisita,
} from "@/components/ordens-servico/os-cliente-nome-visita-field";
import { OsDescontoResumo } from "@/components/ordens-servico/os-desconto-resumo";
import {
  OsAmbientesComercialPanel,
  persistAmbientesBeforeFinish,
} from "@/components/ordens-servico/os-ambientes-comercial-panel";
import {
  OsFinanciamentoFields,
  useFinanciamentoState,
} from "@/components/ordens-servico/os-financiamento-fields";
import { OsVisitPaymentCapture, type OsVisitPaymentCaptureHandle } from "@/components/ordens-servico/os-visit-payment-capture";
import { initialValorComercialInput } from "@/lib/ordens-servico/os-valores-etapa";
import type { OsAmbienteFormRow } from "@/lib/ordens-servico/os-ambientes";
import { visitPaymentFromOrdem } from "@/lib/ordens-servico/visit-payment";
import { t } from "@/lib/i18n";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

const textareaClass =
  "w-full min-h-[120px] resize-y rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus disabled:cursor-not-allowed disabled:bg-cc-border-light";

type Props = {
  ordem: OrdemServicoWithRelations;
  fluxoBloqueado?: boolean;
  onAtualizado: () => void;
  onConcluido: () => void;
};

/** Execução etapa commercial — página /os/[id] apenas. */
export function OsWorkspaceCommercial({
  ordem,
  fluxoBloqueado = false,
  onAtualizado,
  onConcluido,
}: Props) {
  const [valorComercial, setValorComercial] = useState(initialValorComercialInput(ordem));
  const [financiamento, setFinanciamento] = useFinanciamentoState(ordem);
  const [anotacoes, setAnotacoes] = useState(ordem.anotacoes_tecnicas ?? "");
  const [clienteNome, setClienteNome] = useState(ordem.cliente?.nome ?? "");
  const [ambienteRows, setAmbienteRows] = useState<OsAmbienteFormRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const paymentCaptureRef = useRef<OsVisitPaymentCaptureHandle>(null);

  useEffect(() => {
    setAnotacoes(ordem.anotacoes_tecnicas ?? "");
    setClienteNome(ordem.cliente?.nome ?? "");
    setValorComercial(initialValorComercialInput(ordem));
  }, [ordem.anotacoes_tecnicas, ordem.cliente?.nome, ordem.valor_comercial, ordem.id]);

  const handleRowsChange = useCallback((rows: OsAmbienteFormRow[]) => {
    setAmbienteRows(rows);
  }, []);

  function salvarFinanciamento() {
    startTransition(async () => {
      setMsg(null);
      const r = await salvarFormaPagamentoComercial(ordem.id, financiamento);
      if (!r.ok) setMsg(r.message);
      else onAtualizado();
    });
  }

  function salvarValor() {
    startTransition(async () => {
      setMsg(null);
      const r = await salvarValorComercial(ordem.id, valorComercial);
      if (!r.ok) setMsg(r.message);
      else onAtualizado();
    });
  }

  function finalizar() {
    if (!confirm(t("os.visit.confirmFinish"))) return;
    startTransition(async () => {
      setMsg(null);
      const nomeOk = await persistirNomeClienteAntesFinalizarVisita(
        ordem.id,
        clienteNome,
        ordem.cliente?.nome ?? "",
      );
      if (!nomeOk.ok) {
        setMsg(nomeOk.message);
        return;
      }
      const persist = await persistAmbientesBeforeFinish(ordem.id, ambienteRows);
      if (!persist.ok) {
        setMsg(persist.message);
        return;
      }
      const payment =
        paymentCaptureRef.current?.getPayload() ?? visitPaymentFromOrdem(ordem);
      const flush = await paymentCaptureRef.current?.flushReceipts();
      if (flush && !flush.ok) {
        setMsg(flush.message);
        return;
      }
      const saveValor = await salvarValorComercial(ordem.id, valorComercial);
      if (!saveValor.ok) {
        setMsg(saveValor.message);
        return;
      }
      const saveFin = await salvarFormaPagamentoComercial(ordem.id, financiamento);
      if (!saveFin.ok) {
        setMsg(saveFin.message);
        return;
      }
      const r = await finalizarVisitaComercial(
        ordem.id,
        anotacoes,
        payment,
        financiamento,
      );
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      onConcluido();
    });
  }

  return (
    <div className="space-y-4">
      <OsClienteNomeVisitaField
        ordemId={ordem.id}
        value={clienteNome}
        nomeSalvo={ordem.cliente?.nome ?? ""}
        disabled={pending || fluxoBloqueado}
        onChange={setClienteNome}
        onSaved={() => onAtualizado()}
        onError={setMsg}
      />

      <OsDescontoResumo ordem={ordem} />

      <OsAmbientesComercialPanel
        ordem={ordem}
        disabled={pending}
        valorComercial={valorComercial}
        onValorComercialChange={setValorComercial}
        onValorComercialBlur={salvarValor}
        onRowsChange={handleRowsChange}
        onAmbientesSaved={() => onAtualizado()}
        onMessage={setMsg}
      />

      <OsFinanciamentoFields
        ordem={ordem}
        disabled={pending}
        value={financiamento}
        onChange={setFinanciamento}
      />
      <div className="-mt-2 flex justify-end">
        <button
          type="button"
          disabled={pending || !financiamento.forma_pagamento}
          onClick={salvarFinanciamento}
          className="text-[11px] font-medium text-cc-muted underline-offset-2 hover:text-cc-ink hover:underline disabled:opacity-40"
        >
          {t("os.financing.save")}
        </button>
      </div>

      <div>
        <label
          htmlFor={`ws-anotacoes-${ordem.id}`}
          className="block text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted"
        >
          {t("os.visit.technicalNotes")}
        </label>
        <textarea
          id={`ws-anotacoes-${ordem.id}`}
          className={`mt-2 ${textareaClass}`}
          value={anotacoes}
          onChange={(e) => setAnotacoes(e.target.value)}
          placeholder={t("os.visit.technicalNotesHint")}
          disabled={pending}
        />
      </div>

      <OsVisitPaymentCapture ref={paymentCaptureRef} ordem={ordem} disabled={pending} />

      {msg ? (
        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
          {msg}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pending || fluxoBloqueado}
        onClick={finalizar}
        className="w-full rounded-sm bg-cc-ink py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-lift hover:bg-cc-deep disabled:opacity-40"
      >
        {pending ? t("os.visit.finishing") : t("os.visit.finishVisit")}
      </button>
    </div>
  );
}
