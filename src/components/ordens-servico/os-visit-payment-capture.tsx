"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import {
  listarComprovantePagamentoVisita,
  removerAnexoVisitaComercial,
  salvarCapturaPagamentoVisita,
} from "@/app/ordens-servico/visita-comercial-actions";
import { OsPhotoUploadActions } from "@/components/ordens-servico/os-photo-upload-actions";
import { OsMoneyInput } from "@/components/ordens-servico/os-valores-etapa-fields";
import { t } from "@/lib/i18n";
import { uploadComprovantePagamentoViaApi } from "@/lib/ordens-servico/upload-anexos-client";
import {
  VISIT_PAYMENT_METHODS,
  tVisitPaymentMethod,
  visitPaymentFromOrdem,
  type VisitPaymentCapture,
} from "@/lib/ordens-servico/visit-payment";
import type { OrdemServicoWithRelations, OsAnexoComUrl } from "@/lib/types/database";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

const labelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.06em] text-cc-muted";

type PendingReceipt = {
  file: File;
  previewUrl: string | null;
};

export type OsVisitPaymentCaptureHandle = {
  getPayload: () => VisitPaymentCapture;
  /** Upload/remove comprovante — chamar antes de finalizar visita. */
  flushReceipts: () => Promise<{ ok: true } | { ok: false; message: string }>;
};

type Props = {
  ordem: OrdemServicoWithRelations;
  disabled?: boolean;
};

export const OsVisitPaymentCapture = forwardRef<OsVisitPaymentCaptureHandle, Props>(
  function OsVisitPaymentCapture({ ordem, disabled = false }, ref) {
    const [capture, setCapture] = useState<VisitPaymentCapture>(() =>
      visitPaymentFromOrdem(ordem),
    );
    const captureRef = useRef(capture);
    captureRef.current = capture;
    const saveChain = useRef(Promise.resolve());
    const [savedReceipt, setSavedReceipt] = useState<OsAnexoComUrl | null>(null);
    const [pendingReceipt, setPendingReceipt] = useState<PendingReceipt | null>(null);
    const [removeSavedReceipt, setRemoveSavedReceipt] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const ordemIdRef = useRef(ordem.id);

    useEffect(() => {
      if (ordemIdRef.current === ordem.id) return;
      ordemIdRef.current = ordem.id;
      const next = visitPaymentFromOrdem(ordem);
      captureRef.current = next;
      setCapture(next);
      setSavedReceipt(null);
      setPendingReceipt(null);
      setRemoveSavedReceipt(false);
      setSaveError(null);
    }, [ordem]);

    useEffect(() => {
      let cancelled = false;
      void (async () => {
        const { comprovante } = await listarComprovantePagamentoVisita(ordem.id);
        if (!cancelled) {
          setSavedReceipt(comprovante);
          setRemoveSavedReceipt(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [ordem.id]);

    useEffect(() => {
      return () => {
        if (pendingReceipt?.previewUrl) {
          URL.revokeObjectURL(pendingReceipt.previewUrl);
        }
      };
    }, [pendingReceipt?.previewUrl]);

    useImperativeHandle(
      ref,
      () => ({
        getPayload: () => captureRef.current,
        flushReceipts: async () => {
          if (removeSavedReceipt && savedReceipt?.id) {
            const r = await removerAnexoVisitaComercial(savedReceipt.id);
            if (!r.ok) return r;
          }
          if (pendingReceipt?.file) {
            const r = await uploadComprovantePagamentoViaApi(
              ordem.id,
              pendingReceipt.file,
            );
            if (!r.ok) return r;
          }
          return { ok: true };
        },
      }),
      [ordem.id, pendingReceipt, removeSavedReceipt, savedReceipt],
    );

    function update(partial: Partial<VisitPaymentCapture>) {
      const next = { ...captureRef.current, ...partial };
      captureRef.current = next;
      setCapture(next);
      return next;
    }

    function persist(next: VisitPaymentCapture) {
      saveChain.current = saveChain.current
        .catch(() => undefined)
        .then(async () => {
          try {
            const r = await salvarCapturaPagamentoVisita(ordem.id, next);
            setSaveError(r.ok ? null : r.message);
          } catch (e) {
            setSaveError(e instanceof Error ? e.message : "Error saving payment");
          }
        });
    }

    function onReceivedToggle(checked: boolean) {
      if (!checked) {
        const cleared: VisitPaymentCapture = {
          received: false,
          amount: "",
          method: "",
          notes: "",
        };
        captureRef.current = cleared;
        setCapture(cleared);
        setPendingReceipt((prev) => {
          if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
          return null;
        });
        setRemoveSavedReceipt(Boolean(savedReceipt));
        void persist(cleared);
        return;
      }
      void persist(update({ received: true }));
    }

    function onReceiptSelected(files: File[]) {
      const file = files[0];
      if (!file) return;
      const previewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null;
      setPendingReceipt((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return { file, previewUrl };
      });
      setRemoveSavedReceipt(false);
    }

    function clearPendingReceipt() {
      setPendingReceipt((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return null;
      });
    }

    const displayReceipt =
      pendingReceipt != null
        ? {
            url: pendingReceipt.previewUrl ?? "",
            nome_arquivo: pendingReceipt.file.name,
            mime_type: pendingReceipt.file.type,
            isPending: true,
          }
        : savedReceipt && !removeSavedReceipt
          ? {
              url: savedReceipt.url,
              nome_arquivo: savedReceipt.nome_arquivo,
              mime_type: savedReceipt.mime_type,
              isPending: false,
            }
          : null;

    const isPdf =
      displayReceipt?.mime_type === "application/pdf" ||
      displayReceipt?.nome_arquivo.toLowerCase().endsWith(".pdf");

    return (
      <div className="rounded-sm border border-cc-border/80 bg-cc-surface/40 p-3">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={capture.received}
            disabled={disabled}
            onChange={(e) => onReceivedToggle(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-cc-border accent-cc-ink"
          />
          <span className="text-sm font-medium text-cc-ink">
            {t("os.visitPayment.receivedLabel")}
          </span>
        </label>

        {capture.received ? (
          <div className="mt-3 space-y-3 border-t border-cc-border/60 pt-3">
            <p className="text-[11px] leading-snug text-cc-muted">
              {t("os.visitPayment.hint")}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`pay-amt-${ordem.id}`} className={labelClass}>
                  {t("os.visitPayment.amount")}
                </label>
                <div className="mt-1">
                  <OsMoneyInput
                    id={`pay-amt-${ordem.id}`}
                    compact
                    disabled={disabled}
                    value={capture.amount}
                    onChange={(amount) => update({ amount })}
                    onBlur={(amount) => {
                      void persist(update({ amount }));
                    }}
                  />
                </div>
              </div>
              <div>
                <label htmlFor={`pay-method-${ordem.id}`} className={labelClass}>
                  {t("os.visitPayment.method")}
                </label>
                <select
                  id={`pay-method-${ordem.id}`}
                  disabled={disabled}
                  className={`mt-1 ${inputClass}`}
                  value={capture.method}
                  onChange={(e) => {
                    void persist(
                      update({
                        method: e.target.value as VisitPaymentCapture["method"],
                      }),
                    );
                  }}
                >
                  <option value="">{t("os.visitPayment.selectMethod")}</option>
                  {VISIT_PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {tVisitPaymentMethod(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor={`pay-notes-${ordem.id}`} className={labelClass}>
                {t("os.visitPayment.notes")}
              </label>
              <textarea
                id={`pay-notes-${ordem.id}`}
                disabled={disabled}
                rows={2}
                className={`mt-1 min-h-[56px] resize-y ${inputClass}`}
                value={capture.notes}
                onChange={(e) => update({ notes: e.target.value })}
                onBlur={() => {
                  void persist(captureRef.current);
                }}
              />
            </div>

            {saveError ? (
              <p className="text-sm text-cc-red">{saveError}</p>
            ) : null}

            <div>
              <p className={labelClass}>{t("os.visitPayment.receipt")}</p>
              {displayReceipt ? (
                <div className="mt-2 flex items-start gap-3">
                  {displayReceipt.url && !isPdf ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        window.open(
                          displayReceipt.url,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                      className="shrink-0 overflow-hidden rounded-sm border border-cc-border bg-white hover:ring-2 hover:ring-cc-blue-soft/40"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayReceipt.url}
                        alt={displayReceipt.nome_arquivo}
                        className="h-16 w-16 object-cover"
                      />
                    </button>
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-sm border border-cc-border bg-cc-border-light text-[10px] font-semibold uppercase text-cc-muted">
                      PDF
                    </span>
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium text-cc-ink">
                      {displayReceipt.nome_arquivo}
                    </p>
                    {displayReceipt.isPending ? (
                      <p className="text-xs text-cc-muted">
                        Será enviado ao finalizar a visita
                      </p>
                    ) : displayReceipt.url ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          window.open(
                            displayReceipt.url,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        className="text-xs font-medium text-cc-blue hover:underline"
                      >
                        {t("os.visitPayment.receiptOpen")}
                      </button>
                    ) : null}
                    <div className="mt-2 space-y-2">
                      <OsPhotoUploadActions
                        disabled={disabled}
                        takePhotoLabel={t("os.visitPayment.receiptTakePhoto")}
                        choosePhotosLabel={t("os.visitPayment.receiptChooseFile")}
                        galleryAccept="image/*,application/pdf"
                        galleryMultiple={false}
                        className="flex flex-col gap-2 sm:flex-row"
                        onFilesSelected={onReceiptSelected}
                      />
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (pendingReceipt) {
                            clearPendingReceipt();
                            return;
                          }
                          setRemoveSavedReceipt(true);
                        }}
                        className="text-xs text-cc-red hover:underline"
                      >
                        {t("os.visitPayment.receiptRemove")}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <OsPhotoUploadActions
                  disabled={disabled}
                  takePhotoLabel={t("os.visitPayment.receiptTakePhoto")}
                  choosePhotosLabel={t("os.visitPayment.receiptChooseFile")}
                  galleryAccept="image/*,application/pdf"
                  galleryMultiple={false}
                  onFilesSelected={onReceiptSelected}
                />
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  },
);
