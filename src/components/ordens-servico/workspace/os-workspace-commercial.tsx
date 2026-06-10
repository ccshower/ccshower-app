"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  OsVisitPaymentCapture,
  type OsVisitPaymentCaptureHandle,
} from "@/components/ordens-servico/os-visit-payment-capture";
import {
  finalizarVisitaComercial,
  listarAnexosVisitaComUrls,
  removerAnexoVisitaComercial,
  salvarFormaPagamentoComercial,
  salvarValorComercial,
} from "@/app/ordens-servico/visita-comercial-actions";
import {
  OsFinanciamentoFields,
  useFinanciamentoState,
} from "@/components/ordens-servico/os-financiamento-fields";
import { OsValorEditableField } from "@/components/ordens-servico/os-valores-etapa-fields";
import { initialValorComercialInput } from "@/lib/ordens-servico/os-valores-etapa";
import { OsPhotoUploadActions } from "@/components/ordens-servico/os-photo-upload-actions";
import { uploadAnexosVisitaViaApi } from "@/lib/ordens-servico/upload-anexos-client";
import { t } from "@/lib/i18n";
import { visitPaymentFromOrdem } from "@/lib/ordens-servico/visit-payment";
import type { OrdemServicoWithRelations, OsAnexoComUrl } from "@/lib/types/database";

const textareaClass =
  "w-full min-h-[120px] resize-y rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

type Props = {
  ordem: OrdemServicoWithRelations;
  fluxoBloqueado?: boolean;
  onAtualizado: () => void;
};

/** Execução etapa commercial — página /os/[id] apenas. */
export function OsWorkspaceCommercial({
  ordem,
  fluxoBloqueado = false,
  onAtualizado,
}: Props) {
  const [valorComercial, setValorComercial] = useState(initialValorComercialInput(ordem));
  const [financiamento, setFinanciamento] = useFinanciamentoState(ordem);
  const [anotacoes, setAnotacoes] = useState(ordem.anotacoes_tecnicas ?? "");
  const [anexos, setAnexos] = useState<OsAnexoComUrl[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const paymentCaptureRef = useRef<OsVisitPaymentCaptureHandle>(null);

  const carregarAnexos = useCallback(async () => {
    const { anexos: lista, error } = await listarAnexosVisitaComUrls(ordem.id);
    if (!error) setAnexos(lista);
  }, [ordem.id]);

  useEffect(() => {
    void carregarAnexos();
  }, [carregarAnexos]);

  useEffect(() => {
    setAnotacoes(ordem.anotacoes_tecnicas ?? "");
    setValorComercial(initialValorComercialInput(ordem));
  }, [ordem.anotacoes_tecnicas, ordem.valor_comercial, ordem.id]);

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

  function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    startTransition(async () => {
      setMsg(null);
      const r = await uploadAnexosVisitaViaApi(ordem.id, files);
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      await carregarAnexos();
    });
  }

  function finalizar() {
    if (!confirm(t("os.visit.confirmFinish"))) return;
    startTransition(async () => {
      setMsg(null);
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
      onAtualizado();
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
        <OsValorEditableField
          label={t("os.workspace.valores.commercial")}
          value={valorComercial}
          disabled={pending}
          onChange={setValorComercial}
          onBlur={salvarValor}
        />
        <p className="mt-2 text-xs font-light text-cc-muted">
          {t("os.workspace.valores.commercialHint")}
        </p>
      </section>

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
          placeholder="Measurements, cuts, hardware…"
          disabled={pending}
        />
      </div>

      <OsVisitPaymentCapture ref={paymentCaptureRef} ordem={ordem} disabled={pending} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
          {t("os.visit.photos")}
        </p>
        <OsPhotoUploadActions
          disabled={pending}
          onFilesSelected={onFilesSelected}
        />
        {anexos.length > 0 ? (
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {anexos.map((a) => (
              <li
                key={a.id}
                className="relative aspect-square overflow-hidden rounded-sm border border-cc-border"
              >
                {a.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt={a.nome_arquivo} className="h-full w-full object-cover" />
                ) : null}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("Remove photo?")) return;
                    startTransition(async () => {
                      const r = await removerAnexoVisitaComercial(a.id);
                      if (r.ok) await carregarAnexos();
                    });
                  }}
                  className="absolute right-1 top-1 rounded-sm bg-black/55 px-1 text-[10px] text-white"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

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
