"use client";

import { useRef, useState, useTransition } from "react";

import { OsAmbientesAnexosFileGrouped } from "@/components/ordens-servico/os-ambientes-anexos-file-grouped";
import { groupAnexosByAmbiente } from "@/lib/ordens-servico/os-ambientes";
import { uploadCncViaApi } from "@/lib/ordens-servico/upload-cnc-client";
import { t } from "@/lib/i18n";
import type { OrdemServicoWithRelations, OsAnexoComUrl } from "@/lib/types/database";

const sectionLabel =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted";

const CNC_ACCEPT =
  ".nc,.txt,.tap,.gcode,.pdf,.dxf,.dwg,application/pdf,text/plain";

type Props = {
  ordem: OrdemServicoWithRelations;
  disabled?: boolean;
  onAtualizado: () => void;
  onMessage?: (message: string | null) => void;
};

/** Upload e listagem de CNC por ambiente — etapa Projeto. */
export function OsAmbientesCncProjectPanel({
  ordem,
  disabled = false,
  onAtualizado,
  onMessage,
}: Props) {
  const ambientes = ordem.ambientes ?? [];
  const anexosCnc: OsAnexoComUrl[] =
    ordem.anexos_cnc?.length
      ? ordem.anexos_cnc
      : ordem.anexo_cnc
        ? [ordem.anexo_cnc]
        : [];

  const [pendingAmbienteId, setPendingAmbienteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const useMultiAmbiente = ambientes.length > 0;
  const { groups, orphans } = groupAnexosByAmbiente(anexosCnc, ambientes);

  function openPicker(ambienteId: string | null) {
    setPendingAmbienteId(ambienteId);
    fileRef.current?.click();
  }

  function onFilesSelected(files: FileList | null) {
    const list = files?.length ? Array.from(files) : [];
    if (fileRef.current) fileRef.current.value = "";
    if (list.length === 0) return;

    startTransition(async () => {
      onMessage?.(null);
      setFeedback(null);
      const r = await uploadCncViaApi(ordem.id, list, pendingAmbienteId);
      setPendingAmbienteId(null);
      if (!r.ok) {
        onMessage?.(r.message);
        return;
      }
      setFeedback(
        t("os.workspace.project.cncUploaded", {
          count: String(r.count ?? list.length),
        }),
      );
      onAtualizado();
    });
  }

  return (
    <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
      <p className={sectionLabel}>{t("os.workspace.project.cncTitle")}</p>
      <p className="mt-1 text-xs font-light text-cc-muted">
        {useMultiAmbiente
          ? t("os.workspace.project.cncPerAmbienteHint")
          : t("os.workspace.project.cncHint")}
      </p>

      {feedback ? (
        <p className="mt-2 rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {feedback}
        </p>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        multiple
        accept={CNC_ACCEPT}
        className="hidden"
        disabled={disabled || pending}
        onChange={(e) => onFilesSelected(e.target.files)}
      />

      {useMultiAmbiente ? (
        <ul className="mt-3 space-y-3">
          {ambientes.map((amb) => {
            const files = groups.find((g) => g.ambienteId === amb.id)?.fotos ?? [];
            return (
              <li
                key={amb.id}
                className="rounded-sm border border-cc-border bg-white/80 p-3 shadow-sheet"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-cc-ink">{amb.nome}</p>
                  {files.length > 0 ? (
                    <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-cc-muted">
                      {t("os.workspace.project.cncFileCount", {
                        count: String(files.length),
                      })}
                    </span>
                  ) : null}
                </div>
                {amb.especificacoes?.trim() ? (
                  <p className="mt-1 whitespace-pre-wrap text-xs font-light text-cc-deep">
                    {amb.especificacoes}
                  </p>
                ) : null}

                {files.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {files.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-sm border border-cc-border/70 bg-cc-surface/40 px-2 py-1.5"
                      >
                        <p className="min-w-0 truncate text-sm font-light text-cc-ink">
                          {item.nome_arquivo}
                        </p>
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-xs font-medium text-cc-deep underline"
                          >
                            {t("os.workspace.project.cncOpen")}
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-cc-muted">
                    {t("os.workspace.project.cncNoneForAmbiente")}
                  </p>
                )}

                <button
                  type="button"
                  disabled={disabled || pending}
                  onClick={() => openPicker(amb.id)}
                  className="mt-3 w-full rounded-sm border border-dashed border-cc-border px-3 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted hover:border-cc-blue-soft hover:bg-cc-blue-soft/10 disabled:opacity-40"
                >
                  {pending && pendingAmbienteId === amb.id
                    ? t("os.workspace.project.cncUploading")
                    : t("os.workspace.project.cncUploadForAmbiente")}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          {anexosCnc.length > 0 ? (
            <div className="mt-3">
              <OsAmbientesAnexosFileGrouped ambientes={[]} anexos={anexosCnc} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-cc-muted">{t("os.workspace.project.cncNone")}</p>
          )}
          <button
            type="button"
            disabled={disabled || pending}
            onClick={() => openPicker(null)}
            className="mt-3 w-full rounded-sm border border-cc-border bg-white py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light disabled:opacity-40"
          >
            {pending
              ? t("os.workspace.project.cncUploading")
              : anexosCnc.length > 0
                ? t("os.workspace.project.cncAdd")
                : t("os.workspace.project.cncUpload")}
          </button>
        </>
      )}

      {useMultiAmbiente && orphans.length > 0 ? (
        <div className="mt-4 border-t border-cc-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
            {t("os.workspace.project.cncGeneral")}
          </p>
          <div className="mt-2">
            <OsAmbientesAnexosFileGrouped ambientes={[]} anexos={orphans} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
