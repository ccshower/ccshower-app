"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { salvarStatusAmbienteInstalacao } from "@/app/ordens-servico/instalacao-actions";
import { OsPhotoUploadActions } from "@/components/ordens-servico/os-photo-upload-actions";
import {
  ambienteInstalacaoFromRow,
  ambienteInstalacaoSomenteLeitura,
  categoriasBloqueioAmbienteInstalacao,
  isAmbienteInstalacaoConcluido,
  motivosBloqueioAmbienteInstalacao,
  type AmbienteInstalacaoCapture,
  type OsAmbienteInstalacaoStatus,
} from "@/lib/ordens-servico/os-ambiente-instalacao";
import { groupAnexosByAmbiente } from "@/lib/ordens-servico/os-ambientes";
import { uploadFotosInstalacaoViaApi } from "@/lib/ordens-servico/upload-anexos-client";
import { t } from "@/lib/i18n";
import type { OrdemServicoWithRelations, OsAmbiente, OsAnexoComUrl } from "@/lib/types/database";

const sectionLabel =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted";

const inputClass =
  "mt-1 w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus";

const textareaClass =
  "mt-1 w-full min-h-[72px] resize-y rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus";

type Props = {
  ordem: OrdemServicoWithRelations;
  fotos: OsAnexoComUrl[];
  disabled?: boolean;
  onAtualizado: () => void;
  onReloadFotos: () => Promise<void>;
  onMessage?: (message: string | null) => void;
};

function statusBadgeClass(status: OsAmbienteInstalacaoStatus): string {
  if (status === "completed") return "bg-emerald-50 text-emerald-800";
  if (status === "blocked") return "bg-amber-50 text-amber-900";
  return "bg-cc-canvas text-cc-muted";
}

function AmbienteInstalacaoCard({
  ordemId,
  ambiente,
  fotos,
  disabled,
  onAtualizado,
  onReloadFotos,
  onMessage,
}: {
  ordemId: string;
  ambiente: OsAmbiente;
  fotos: OsAnexoComUrl[];
  disabled?: boolean;
  onAtualizado: () => void;
  onReloadFotos: () => Promise<void>;
  onMessage?: (message: string | null) => void;
}) {
  const initial = ambienteInstalacaoFromRow(ambiente);
  const [status, setStatus] = useState<OsAmbienteInstalacaoStatus>(initial.status);
  const [categoria, setCategoria] = useState(initial.bloqueio_categoria ?? "");
  const [motivo, setMotivo] = useState(initial.bloqueio_motivo ?? "");
  const [observacao, setObservacao] = useState(initial.bloqueio_observacao ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const next = ambienteInstalacaoFromRow(ambiente);
    setStatus(next.status);
    setCategoria(next.bloqueio_categoria ?? "");
    setMotivo(next.bloqueio_motivo ?? "");
    setObservacao(next.bloqueio_observacao ?? "");
  }, [
    ambiente.id,
    ambiente.instalacao_status,
    ambiente.instalacao_bloqueio_categoria,
    ambiente.instalacao_bloqueio_motivo,
    ambiente.instalacao_bloqueio_observacao,
  ]);

  const categorias = categoriasBloqueioAmbienteInstalacao();
  const motivos = useMemo(
    () => motivosBloqueioAmbienteInstalacao(categoria),
    [categoria],
  );

  function persistStatus(next: AmbienteInstalacaoCapture) {
    startTransition(async () => {
      onMessage?.(null);
      const r = await salvarStatusAmbienteInstalacao(ordemId, ambiente.id, next);
      if (!r.ok) {
        onMessage?.(r.message);
        return;
      }
      onAtualizado();
    });
  }

  function onStatusChange(next: OsAmbienteInstalacaoStatus) {
    setStatus(next);
    if (next === "pending") {
      setCategoria("");
      setMotivo("");
      setObservacao("");
      persistStatus({
        status: "pending",
        bloqueio_categoria: null,
        bloqueio_motivo: null,
        bloqueio_observacao: null,
      });
      return;
    }
    if (next === "completed") {
      if (fotos.length > 0) {
        persistStatus({
          status: "completed",
          bloqueio_categoria: null,
          bloqueio_motivo: null,
          bloqueio_observacao: null,
        });
      } else {
        onMessage?.(t("os.workspace.installation.ambientePhotosRequired"));
      }
      return;
    }
  }

  function onBlockSave() {
    persistStatus({
      status: "blocked",
      bloqueio_categoria: categoria || null,
      bloqueio_motivo: motivo || null,
      bloqueio_observacao: observacao || null,
    });
  }

  async function confirmarConcluidoAposFoto() {
    const r = await salvarStatusAmbienteInstalacao(ordemId, ambiente.id, {
      status: "completed",
      bloqueio_categoria: null,
      bloqueio_motivo: null,
      bloqueio_observacao: null,
    });
    if (!r.ok) {
      onMessage?.(r.message);
      return;
    }
    onAtualizado();
  }

  function onPhotosSelected(files: File[]) {
    if (files.length === 0) return;
    startTransition(async () => {
      onMessage?.(null);
      const r = await uploadFotosInstalacaoViaApi(ordemId, files, ambiente.id);
      if (!r.ok) {
        onMessage?.(r.message);
        return;
      }
      await onReloadFotos();
      const deveConcluir =
        status === "completed" || isAmbienteInstalacaoConcluido(ambiente);
      if (deveConcluir) {
        await confirmarConcluidoAposFoto();
      } else {
        onAtualizado();
      }
    });
  }

  const somenteLeitura = ambienteInstalacaoSomenteLeitura(ambiente, fotos.length);
  const busy = disabled || pending || somenteLeitura;

  if (somenteLeitura) {
    return (
      <li className="rounded-sm border border-emerald-200 bg-emerald-50/40 p-3 shadow-sheet">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-cc-ink">{ambiente.nome}</p>
          <span className="rounded-ds bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            {t("os.workspace.project.ambienteInstalado")}
          </span>
        </div>
        {fotos.length > 0 ? (
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
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
        <p className="mt-2 text-xs text-cc-muted">
          {t("os.workspace.installation.ambienteJaInstaladoHint")}
        </p>
      </li>
    );
  }

  return (
    <li className="rounded-sm border border-cc-border bg-white/80 p-3 shadow-sheet">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-cc-ink">{ambiente.nome}</p>
        <span
          className={`rounded-ds px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(status)}`}
        >
          {t(`os.workspace.installation.ambienteStatus.${status}`)}
        </span>
      </div>

      {ambiente.especificacoes?.trim() ? (
        <p className="mt-1 whitespace-pre-wrap text-xs font-light text-cc-deep">
          {ambiente.especificacoes}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {(["pending", "completed", "blocked"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={busy}
            onClick={() => onStatusChange(opt)}
            className={`rounded-sm border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              status === opt
                ? "border-cc-ink bg-cc-ink text-white"
                : "border-cc-border bg-white text-cc-muted hover:border-cc-border-strong"
            }`}
          >
            {t(`os.workspace.installation.ambienteStatus.${opt}`)}
          </button>
        ))}
      </div>

      {status === "blocked" ? (
        <div className="mt-3 space-y-2 border-t border-cc-border/60 pt-3">
          <p className="text-xs text-cc-muted">
            {t("os.workspace.installation.ambienteBlockHint")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className={sectionLabel}>
                {t("os.workspace.installation.blockCategory")}
              </label>
              <select
                disabled={busy}
                className={inputClass}
                value={categoria}
                onChange={(e) => {
                  setCategoria(e.target.value);
                  setMotivo("");
                }}
              >
                <option value="">{t("os.workspace.installation.blockSelect")}</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={sectionLabel}>
                {t("os.workspace.installation.blockReason")}
              </label>
              <select
                disabled={busy || !categoria}
                className={inputClass}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              >
                <option value="">{t("os.workspace.installation.blockSelect")}</option>
                {motivos.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={sectionLabel}>
              {t("os.workspace.installation.blockNotes")}
            </label>
            <textarea
              disabled={busy}
              className={textareaClass}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder={t("os.workspace.installation.blockNotesPlaceholder")}
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onBlockSave}
            className="rounded-sm border border-amber-300 bg-amber-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900"
          >
            {t("os.workspace.installation.saveBlock")}
          </button>
        </div>
      ) : null}

      <div className="mt-3 border-t border-cc-border/60 pt-3">
        <p className={sectionLabel}>{t("os.workspace.installation.photosTitle")}</p>
        <OsPhotoUploadActions
          disabled={busy}
          onFilesSelected={onPhotosSelected}
          takePhotoLabel={t("os.workspace.installation.takePhoto")}
          choosePhotosLabel={t("os.workspace.installation.choosePhotos")}
          className="mt-2 flex flex-col gap-2 sm:flex-row"
        />
        {fotos.length > 0 ? (
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
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
        ) : (
          <p className="mt-2 text-xs text-amber-700">
            {t("os.workspace.installation.ambientePhotosRequired")}
          </p>
        )}
        {isAmbienteInstalacaoConcluido(ambiente) && fotos.length === 0 ? (
          <p className="mt-2 text-xs font-medium text-amber-800">
            {t("os.workspace.installation.ambienteConcluidoSemFoto")}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/** Fotos e status por ambiente — etapa Instalação. */
export function OsAmbientesInstallationPanel({
  ordem,
  fotos,
  disabled = false,
  onAtualizado,
  onReloadFotos,
  onMessage,
}: Props) {
  const ambientes = ordem.ambientes ?? [];
  const { groups, orphans } = groupAnexosByAmbiente(fotos, ambientes);

  if (ambientes.length === 0) return null;

  return (
    <section className="rounded-sm border border-cc-border/80 bg-white p-3">
      <p className={sectionLabel}>{t("os.workspace.installation.ambientesTitle")}</p>
      <p className="mt-1 text-xs font-light text-cc-muted">
        {t("os.workspace.installation.ambientesHint")}
      </p>

      <ul className="mt-3 space-y-3">
        {ambientes.map((amb) => (
          <AmbienteInstalacaoCard
            key={amb.id}
            ordemId={ordem.id}
            ambiente={amb}
            fotos={groups.find((g) => g.ambienteId === amb.id)?.fotos ?? []}
            disabled={disabled}
            onAtualizado={onAtualizado}
            onReloadFotos={onReloadFotos}
            onMessage={onMessage}
          />
        ))}
      </ul>

      {orphans.length > 0 ? (
        <div className="mt-3 border-t border-cc-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
            {t("os.workspace.installation.photosGeneral")}
          </p>
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {orphans.map((f) => (
              <li
                key={f.id}
                className="relative aspect-square overflow-hidden rounded-sm border border-cc-border"
              >
                {f.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt={f.nome_arquivo} className="h-full w-full object-cover" />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
