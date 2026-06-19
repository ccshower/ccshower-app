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
} from "@/app/ordens-servico/visita-comercial-actions";
import { OsPhotoUploadActions } from "@/components/ordens-servico/os-photo-upload-actions";
import { t } from "@/lib/i18n";
import { hasAgendaEventoStart } from "@/lib/ordens-servico/agenda-evento-query";
import { uploadAnexosVisitaViaApi } from "@/lib/ordens-servico/upload-anexos-client";
import { visitPaymentFromOrdem } from "@/lib/ordens-servico/visit-payment";
import type { OrdemServicoWithRelations, OsAnexoComUrl } from "@/lib/types/database";

const textareaClass =
  "w-full min-h-[120px] resize-y rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light leading-relaxed text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

type Props = {
  ordem: OrdemServicoWithRelations;
  fluxoBloqueado?: boolean;
  onConcluida?: () => void;
};

/** Bloco 3 — execução etapa commercial (checklist de campo). */
export function OsEtapaCommercialExecucao({
  ordem,
  fluxoBloqueado = false,
  onConcluida,
}: Props) {
  const [anotacoes, setAnotacoes] = useState(ordem.anotacoes_tecnicas ?? "");
  const [anexos, setAnexos] = useState<OsAnexoComUrl[]>(ordem.anexos_visita ?? []);
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
  }, [ordem.anotacoes_tecnicas, ordem.id]);

  function onFilesSelected(files: File[]) {
    if (files.length === 0) return;
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

  function removerAnexo(id: string) {
    if (!confirm("Remove this photo?")) return;
    startTransition(async () => {
      setMsg(null);
      const r = await removerAnexoVisitaComercial(id);
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
      const r = await finalizarVisitaComercial(ordem.id, anotacoes, payment);
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      onConcluida?.();
    });
  }

  const semVisita = !hasAgendaEventoStart(ordem.visita_inicial);

  return (
    <section className="space-y-4" aria-label={t("os.panel.executionAria")}>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-ink">
          {t("os.panel.executionTitle")}
        </h3>
        <p className="mt-1 text-sm font-light text-cc-muted">
          {t("os.visit.subtitle")}
        </p>
      </div>

      {semVisita ? (
        <p className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("os.panel.noVisitScheduled")}
        </p>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor={`anotacoes-${ordem.id}`}
          className="block text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted"
        >
          {t("os.visit.technicalNotes")}
        </label>
        <textarea
          id={`anotacoes-${ordem.id}`}
          className={textareaClass}
          value={anotacoes}
          onChange={(e) => setAnotacoes(e.target.value)}
          placeholder="Measurements, cuts, hardware, bathroom context…"
          disabled={pending}
        />
      </div>

      <OsVisitPaymentCapture ref={paymentCaptureRef} ordem={ordem} disabled={pending} />

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
          {t("os.visit.photos")}
        </p>
        <OsPhotoUploadActions
          disabled={pending}
          onFilesSelected={onFilesSelected}
        />

        {anexos.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {anexos.map((a) => (
              <li
                key={a.id}
                className="group relative aspect-square overflow-hidden rounded-sm border border-cc-border bg-cc-border-light"
              >
                {a.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.url}
                    alt={a.nome_arquivo}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-[10px] text-cc-muted">
                    …
                  </span>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => removerAnexo(a.id)}
                  className="absolute right-1 top-1 rounded-sm bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white"
                  aria-label="Remove photo"
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
        disabled={pending || semVisita || fluxoBloqueado}
        onClick={finalizar}
        className="w-full rounded-sm bg-cc-ink px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-lift hover:bg-cc-deep disabled:opacity-40"
      >
        {pending ? t("os.visit.finishing") : t("os.visit.finishVisit")}
      </button>
    </section>
  );
}
