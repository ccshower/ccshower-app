"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  confirmarSaldoPendenteInstalacao,
  finalizarInstalacao,
  listarComprovantePagamentoInstalacao,
  listarFotosInstalacao,
  salvarObservacoesExecucaoInstalacao,
  salvarPagamentoInstalacao,
} from "@/app/ordens-servico/instalacao-actions";
import { salvarValorRepairInstalacao } from "@/app/ordens-servico/repair-actions";
import { OsCoutingReadonly } from "@/components/ordens-servico/os-couting-field";
import { OsInstallationChecklistModal } from "@/components/ordens-servico/workspace/os-installation-checklist-modal";
import { OsAmbientesInstallationPanel } from "@/components/ordens-servico/workspace/os-ambientes-installation-panel";
import { OsInstallationSeparationCard } from "@/components/ordens-servico/workspace/os-installation-separation-card";
import { OsPhotoUploadActions } from "@/components/ordens-servico/os-photo-upload-actions";
import { OsMoneyInput } from "@/components/ordens-servico/os-valores-etapa-fields";
import { t } from "@/lib/i18n";
import { parseOsAmbienteInstalacaoStatus, validarCapturaBloqueioAmbiente, validarFinalizacaoInstalacaoAmbientes } from "@/lib/ordens-servico/os-ambiente-instalacao";
import { formatOsValorUsd } from "@/lib/ordens-servico/os-valores-etapa";
import {
  buildInstallationFinancialStatus,
  formatInstallationBalance,
  installationPaymentFromOrdem,
  isSeparationItemChecked,
  type InstallationPaymentCapture,
} from "@/lib/ordens-servico/installation-workspace";
import {
  uploadComprovanteInstalacaoViaApi,
  uploadFotosInstalacaoViaApi,
} from "@/lib/ordens-servico/upload-anexos-client";
import { VISIT_PAYMENT_METHODS, tVisitPaymentMethod } from "@/lib/ordens-servico/visit-payment";
import type { OrdemServicoWithRelations, OsAnexoComUrl, OsSeparationListItem } from "@/lib/types/database";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

const textareaClass =
  "w-full min-h-[100px] resize-y rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

const sectionLabel =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted";

const NOTES_SAVE_DELAY_MS = 800;
const PAYMENT_SAVE_DELAY_MS = 600;

type NotesSaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  ordem: OrdemServicoWithRelations;
  fluxoBloqueado?: boolean;
  onAtualizado: () => void;
  onConcluido: () => void;
};

/** Execução etapa Instalação — checklist, fotos, saldo, observações. */
export function OsWorkspaceInstallation({
  ordem,
  fluxoBloqueado = false,
  onAtualizado,
  onConcluido,
}: Props) {
  const ambientes = ordem.ambientes ?? [];
  const useAmbientes = ambientes.length > 0;
  const hasBlockedAmbiente = ambientes.some(
    (a) => parseOsAmbienteInstalacaoStatus(a.instalacao_status) === "blocked",
  );

  const financial = buildInstallationFinancialStatus(ordem);

  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklist, setChecklist] = useState<OsSeparationListItem[]>(
    ordem.lista_separacao ?? [],
  );
  const [fotos, setFotos] = useState<OsAnexoComUrl[]>([]);
  const [executionNotes, setExecutionNotes] = useState(
    ordem.installation_execution_notes ?? "",
  );
  const [notesStatus, setNotesStatus] = useState<NotesSaveStatus>("idle");
  const [payment, setPayment] = useState<InstallationPaymentCapture>(() =>
    installationPaymentFromOrdem(ordem),
  );
  const [balanceAcknowledged, setBalanceAcknowledged] = useState(
    ordem.installation_balance_pending_acknowledged ?? false,
  );
  const [savedReceipt, setSavedReceipt] = useState<OsAnexoComUrl | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [repairValorPending, startRepairValor] = useTransition();

  const repairEpisode = ordem.repair_episode;
  const isRepair = Boolean(ordem.repair_ativo && repairEpisode);
  const [repairValor, setRepairValor] = useState("");
  const [repairObs, setRepairObs] = useState("");

  const validacaoAmbientes = useMemo(
    () =>
      useAmbientes
        ? validarFinalizacaoInstalacaoAmbientes(ambientes, fotos)
        : { ok: true as const, modo: "completa" as const },
    [useAmbientes, ambientes, fotos],
  );

  const checklistPronto = useMemo(
    () =>
      checklist.length === 0 ||
      checklist.every((item) => isSeparationItemChecked(item)),
    [checklist],
  );

  const financeiroPronto = useMemo(() => {
    if (financial.isPaid || financial.balance <= 0) return true;
    if (balanceAcknowledged) return true;
    if (payment.received && payment.amount.trim() && payment.method) {
      return true;
    }
    return false;
  }, [financial.isPaid, financial.balance, balanceAcknowledged, payment]);

  const fotosProntas = useMemo(() => {
    if (!useAmbientes) return fotos.length > 0;
    return validacaoAmbientes.ok;
  }, [useAmbientes, fotos.length, validacaoAmbientes.ok]);

  const podeFinalizar =
    fotosProntas && checklistPronto && financeiroPronto && !fluxoBloqueado;

  const hintFinalizarDesabilitado = useMemo(() => {
    if (podeFinalizar) return null;
    if (!validacaoAmbientes.ok && "message" in validacaoAmbientes) {
      return validacaoAmbientes.message;
    }
    if (!checklistPronto) {
      return t("os.workspace.installation.checklistIncomplete");
    }
    if (!financeiroPronto) {
      return t("os.workspace.installation.financialIncomplete");
    }
    if (!useAmbientes && fotos.length === 0) {
      return t("os.workspace.installation.photosRequired");
    }
    return null;
  }, [
    podeFinalizar,
    validacaoAmbientes,
    checklistPronto,
    financeiroPronto,
    useAmbientes,
    fotos.length,
  ]);

  const savedNotesRef = useRef(ordem.installation_execution_notes ?? "");
  const saveNotesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savePaymentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAtualizadoRef = useRef(onAtualizado);

  useEffect(() => {
    onAtualizadoRef.current = onAtualizado;
  }, [onAtualizado]);

  useEffect(() => {
    setChecklist(ordem.lista_separacao ?? []);
  }, [ordem.lista_separacao, ordem.id]);

  useEffect(() => {
    const next = ordem.installation_execution_notes ?? "";
    setExecutionNotes((prev) => {
      if (prev.trim() === next.trim()) return prev;
      setNotesStatus("idle");
      return next;
    });
    savedNotesRef.current = next;
  }, [ordem.installation_execution_notes, ordem.id]);

  useEffect(() => {
    setPayment(installationPaymentFromOrdem(ordem));
    setBalanceAcknowledged(ordem.installation_balance_pending_acknowledged ?? false);
  }, [
    ordem.id,
    ordem.installation_payment_received,
    ordem.installation_payment_amount,
    ordem.installation_payment_method,
    ordem.installation_payment_notes,
    ordem.installation_balance_pending_acknowledged,
  ]);

  const carregarFotos = useCallback(async () => {
    const { fotos: lista, error } = await listarFotosInstalacao(ordem.id);
    if (!error) setFotos(lista);
  }, [ordem.id]);

  const carregarComprovante = useCallback(async () => {
    const { comprovante } = await listarComprovantePagamentoInstalacao(ordem.id);
    setSavedReceipt(comprovante);
  }, [ordem.id]);

  useEffect(() => {
    void carregarFotos();
    void carregarComprovante();
  }, [carregarFotos, carregarComprovante]);

  useEffect(() => {
    if (!repairEpisode) return;
    const v = repairEpisode.valor_final ?? repairEpisode.valor_sugerido;
    setRepairValor(v != null ? formatOsValorUsd(v) : "");
    setRepairObs(repairEpisode.valor_alteracao_observacao ?? "");
  }, [
    repairEpisode?.id,
    repairEpisode?.valor_final,
    repairEpisode?.valor_sugerido,
    repairEpisode?.valor_alteracao_observacao,
  ]);

  useEffect(() => {
    const current = executionNotes.trim();
    const saved = savedNotesRef.current.trim();
    if (current === saved) return;

    if (saveNotesTimerRef.current) clearTimeout(saveNotesTimerRef.current);
    saveNotesTimerRef.current = setTimeout(() => {
      void (async () => {
        setNotesStatus("saving");
        setMsg(null);
        const r = await salvarObservacoesExecucaoInstalacao(ordem.id, executionNotes);
        if (!r.ok) {
          setNotesStatus("error");
          setMsg(r.message);
          return;
        }
        savedNotesRef.current = executionNotes;
        setNotesStatus("saved");
        onAtualizadoRef.current();
        if (savedIndicatorTimerRef.current) {
          clearTimeout(savedIndicatorTimerRef.current);
        }
        savedIndicatorTimerRef.current = setTimeout(
          () => setNotesStatus("idle"),
          2500,
        );
      })();
    }, NOTES_SAVE_DELAY_MS);

    return () => {
      if (saveNotesTimerRef.current) clearTimeout(saveNotesTimerRef.current);
    };
  }, [executionNotes, ordem.id]);

  useEffect(() => {
    if (savePaymentTimerRef.current) clearTimeout(savePaymentTimerRef.current);
    savePaymentTimerRef.current = setTimeout(() => {
      void (async () => {
        const r = await salvarPagamentoInstalacao(ordem.id, payment);
        if (r.ok) onAtualizadoRef.current();
      })();
    }, PAYMENT_SAVE_DELAY_MS);

    return () => {
      if (savePaymentTimerRef.current) clearTimeout(savePaymentTimerRef.current);
    };
  }, [payment, ordem.id]);

  function onPhotosSelected(files: File[]) {
    if (files.length === 0) return;
    startTransition(async () => {
      setMsg(null);
      const r = await uploadFotosInstalacaoViaApi(ordem.id, files);
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      await carregarFotos();
      onAtualizado();
    });
  }

  function onReceiptSelected(files: File[]) {
    const file = files[0];
    if (!file) return;
    startTransition(async () => {
      setMsg(null);
      const r = await uploadComprovanteInstalacaoViaApi(ordem.id, file);
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      await carregarComprovante();
    });
  }

  function onPaymentReceivedToggle(checked: boolean) {
    if (checked) {
      setBalanceAcknowledged(false);
      void confirmarSaldoPendenteInstalacao(ordem.id, false);
      setPayment((prev) => ({ ...prev, received: true }));
      return;
    }
    setPayment({
      received: false,
      amount: "",
      method: "",
      notes: "",
    });
  }

  function onBalanceAckToggle(checked: boolean) {
    setBalanceAcknowledged(checked);
    if (checked) {
      setPayment({
        received: false,
        amount: "",
        method: "",
        notes: "",
      });
    }
    startTransition(async () => {
      const r = await confirmarSaldoPendenteInstalacao(ordem.id, checked);
      if (!r.ok) setMsg(r.message);
      else onAtualizado();
    });
  }

  function salvarRepairValor() {
    startRepairValor(async () => {
      setMsg(null);
      const r = await salvarValorRepairInstalacao(ordem.id, repairValor, repairObs);
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      onAtualizado();
    });
  }

  function finalizar() {
    const confirmMsg = hasBlockedAmbiente
      ? t("os.workspace.installation.confirmFinishPartial")
      : t("os.workspace.installation.confirmFinish");
    if (!confirm(confirmMsg)) return;

    for (const amb of ambientes) {
      const nome = amb.nome?.trim() || "Ambiente";
      const st = parseOsAmbienteInstalacaoStatus(amb.instalacao_status);
      if (st === "pending") {
        setMsg(`${nome}: ${t("os.workspace.installation.ambientePendingBeforeFinish")}`);
        return;
      }
      if (st === "blocked") {
        const blockErr = validarCapturaBloqueioAmbiente(
          amb.instalacao_bloqueio_categoria,
          amb.instalacao_bloqueio_motivo,
        );
        if (blockErr) {
          setMsg(`${nome}: ${t("os.workspace.installation.ambienteBlockBeforeFinish")}`);
          return;
        }
      }
    }

    startTransition(async () => {
      setMsg(null);
      if (executionNotes.trim() !== savedNotesRef.current.trim()) {
        const save = await salvarObservacoesExecucaoInstalacao(
          ordem.id,
          executionNotes,
        );
        if (!save.ok) {
          setMsg(save.message);
          return;
        }
        savedNotesRef.current = executionNotes;
      }
      const paySave = await salvarPagamentoInstalacao(ordem.id, payment);
      if (!paySave.ok) {
        setMsg(paySave.message);
        return;
      }
      const r = await finalizarInstalacao(ordem.id);
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      if (r.modo === "parcial_projeto") {
        setMsg(t("os.workspace.installation.partialFinishSuccess"));
        onAtualizado();
        return;
      }
      onConcluido();
    });
  }

  const busy = pending || notesStatus === "saving" || repairValorPending;

  return (
    <div className="space-y-4">
      {isRepair ? (
        <div className="rounded-sm border border-violet-200 bg-violet-50/80 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-ds bg-violet-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              {t("os.workspace.installation.repairBadge")}
            </span>
            <p className="text-sm font-light text-violet-950">
              {t("os.workspace.installation.repairBanner")}
            </p>
          </div>
        </div>
      ) : null}

      <OsCoutingReadonly ordem={ordem} />

      {isRepair ? (
        <section className="rounded-sm border border-violet-200/80 bg-white p-3">
          <p className={sectionLabel}>{t("os.workspace.installation.repairValorLabel")}</p>
          <p className="mt-1 text-xs text-cc-muted">
            {t("os.workspace.installation.repairValorHint")}
          </p>
          <div className="mt-3 space-y-3">
            <OsMoneyInput value={repairValor} disabled={busy} onChange={setRepairValor} />
            <div>
              <label className={sectionLabel}>
                {t("os.workspace.installation.repairValorObsLabel")}
              </label>
              <textarea
                disabled={busy}
                className={textareaClass}
                value={repairObs}
                onChange={(e) => setRepairObs(e.target.value)}
                placeholder={t("os.workspace.installation.repairValorObsPlaceholder")}
              />
            </div>
            <button
              type="button"
              disabled={busy || !repairValor.trim()}
              onClick={salvarRepairValor}
              className="rounded-sm border border-violet-300 bg-violet-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-violet-900 disabled:opacity-40"
            >
              {repairValorPending
                ? t("os.workspace.installation.repairValorSaving")
                : t("os.workspace.installation.repairValorSave")}
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-sm border border-cc-border/80 bg-white p-3">
        <p className={sectionLabel}>
          {t("os.workspace.installation.financialTitle")}
        </p>
        {financial.isPaid ? (
          <p className="mt-2 text-sm font-medium text-emerald-700">
            {t("os.workspace.installation.paymentSettled")}
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            <p className="text-sm font-medium text-amber-700">
              {t("os.workspace.installation.balancePending", {
                amount: formatInstallationBalance(financial.balance),
              })}
            </p>

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={payment.received}
                disabled={busy}
                onChange={(e) => onPaymentReceivedToggle(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-cc-border accent-cc-ink"
              />
              <span className="text-sm font-medium text-cc-ink">
                {t("os.workspace.installation.receivedLabel")}
              </span>
            </label>

            {payment.received ? (
              <div className="space-y-3 border-t border-cc-border/60 pt-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={sectionLabel}>
                      {t("os.visitPayment.amount")}
                    </label>
                    <div className="mt-1">
                      <OsMoneyInput
                        compact
                        disabled={busy}
                        value={payment.amount}
                        onChange={(amount) =>
                          setPayment((prev) => ({ ...prev, amount }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className={sectionLabel}>
                      {t("os.visitPayment.method")}
                    </label>
                    <select
                      disabled={busy}
                      className={`mt-1 ${inputClass}`}
                      value={payment.method}
                      onChange={(e) =>
                        setPayment((prev) => ({
                          ...prev,
                          method: e.target.value as InstallationPaymentCapture["method"],
                        }))
                      }
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
                  <p className={sectionLabel}>{t("os.visitPayment.receipt")}</p>
                  {savedReceipt?.url ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm text-cc-ink">
                          {savedReceipt.nome_arquivo}
                        </span>
                        <a
                          href={savedReceipt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-xs text-cc-muted hover:underline"
                        >
                          {t("os.visitPayment.receiptOpen")}
                        </a>
                      </div>
                      <OsPhotoUploadActions
                        disabled={busy}
                        takePhotoLabel={t("os.visitPayment.receiptTakePhoto")}
                        choosePhotosLabel={t("os.visitPayment.receiptChooseFile")}
                        galleryAccept="image/*,application/pdf"
                        galleryMultiple={false}
                        className="flex flex-col gap-2 sm:flex-row"
                        onFilesSelected={onReceiptSelected}
                      />
                    </div>
                  ) : (
                    <OsPhotoUploadActions
                      disabled={busy}
                      takePhotoLabel={t("os.visitPayment.receiptTakePhoto")}
                      choosePhotosLabel={t("os.visitPayment.receiptChooseFile")}
                      galleryAccept="image/*,application/pdf"
                      galleryMultiple={false}
                      onFilesSelected={onReceiptSelected}
                    />
                  )}
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={balanceAcknowledged}
                  disabled={busy}
                  onChange={(e) => onBalanceAckToggle(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-cc-border accent-cc-ink"
                />
                <span className="text-sm font-light text-cc-deep">
                  {t("os.workspace.installation.balanceAcknowledge")}
                </span>
              </label>
            )}
          </div>
        )}
      </section>

      <OsInstallationSeparationCard
        itens={checklist}
        onConferir={() => setChecklistOpen(true)}
      />

      {useAmbientes ? (
        <OsAmbientesInstallationPanel
          ordem={ordem}
          fotos={fotos}
          disabled={busy}
          onAtualizado={onAtualizado}
          onReloadFotos={carregarFotos}
          onMessage={setMsg}
        />
      ) : (
        <section className="rounded-sm border border-cc-border/80 bg-white p-3">
          <p className={sectionLabel}>
            {t("os.workspace.installation.photosTitle")}
          </p>
          <OsPhotoUploadActions
            disabled={busy}
            onFilesSelected={onPhotosSelected}
            takePhotoLabel={t("os.workspace.installation.takePhoto")}
            choosePhotosLabel={t("os.workspace.installation.choosePhotos")}
          />
          {fotos.length > 0 ? (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {fotos.map((f) => (
                <li
                  key={f.id}
                  className="relative aspect-square overflow-hidden rounded-sm border border-cc-border"
                >
                  {f.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.url}
                      alt={f.nome_arquivo}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      <section className="rounded-sm border border-cc-border/80 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <p className={sectionLabel}>
            {t("os.workspace.installation.notesTitle")}
          </p>
          {notesStatus === "saving" ? (
            <span className="text-[11px] font-light text-cc-subtle">
              {t("os.workspace.project.notesSaving")}
            </span>
          ) : null}
          {notesStatus === "saved" ? (
            <span className="text-[11px] font-light text-cc-subtle">
              {t("os.workspace.project.notesSaved")}
            </span>
          ) : null}
        </div>
        <textarea
          disabled={busy}
          className={`mt-2 ${textareaClass}`}
          placeholder={t("os.workspace.installation.notesPlaceholder")}
          value={executionNotes}
          onChange={(e) => setExecutionNotes(e.target.value)}
        />
      </section>

      {msg ? (
        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
          {msg}
        </p>
      ) : null}

      {hintFinalizarDesabilitado && !pending ? (
        <p className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {hintFinalizarDesabilitado}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pending || !podeFinalizar}
        onClick={finalizar}
        className="w-full rounded-sm bg-cc-ink py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-lift hover:bg-cc-deep disabled:opacity-40"
      >
        {pending
          ? t("os.workspace.installation.finishing")
          : hasBlockedAmbiente
            ? t("os.workspace.installation.finishPartial")
            : t("os.workspace.installation.finish")}
      </button>

      <OsInstallationChecklistModal
        osId={ordem.id}
        itensIniciais={checklist}
        open={checklistOpen}
        onClose={() => setChecklistOpen(false)}
        onSalvo={onAtualizado}
      />
    </div>
  );
}
