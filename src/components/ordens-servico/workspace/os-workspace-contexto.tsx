"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { listarAnexosVisitaComUrls } from "@/app/ordens-servico/visita-comercial-actions";
import { OsSeparationListCard } from "@/components/ordens-servico/workspace/os-separation-list-card";
import { OsSeparationListModal } from "@/components/ordens-servico/workspace/os-separation-list-modal";
import { formatWorkspaceDateTime } from "@/components/ordens-servico/workspace/os-workspace-utils";
import { t } from "@/lib/i18n";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import type { OrdemServicoWithRelations, OsAnexoComUrl } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
};

function PreviewDialog({
  open,
  onClose,
  itens,
  index,
  onIndex,
}: {
  open: boolean;
  onClose: () => void;
  itens: OsAnexoComUrl[];
  index: number;
  onIndex: (next: number) => void;
}) {
  const current = itens[index];
  const canPrev = index > 0;
  const canNext = index < itens.length - 1;

  if (!open || !current?.url) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 h-[100dvh] w-[100dvw] bg-black/80 p-0 backdrop:bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={t("os.workspace.contextOpenPhoto")}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-white">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{current.nome_arquivo}</p>
            <p className="text-[11px] text-white/70">
              {formatWorkspaceDateTime(current.criado_em)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm bg-white/10 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-white/15"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 px-3 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.nome_arquivo}
            className="mx-auto h-full max-h-[calc(100dvh-120px)] w-auto max-w-full rounded-sm object-contain"
          />
        </div>

        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => onIndex(index - 1)}
            className="rounded-sm bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-white/15 disabled:opacity-40"
          >
            {t("os.workspace.contextPrev")}
          </button>
          <p className="text-xs text-white/70">
            {index + 1} / {itens.length}
          </p>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => onIndex(index + 1)}
            className="rounded-sm bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-white/15 disabled:opacity-40"
          >
            {t("os.workspace.contextNext")}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** Contexto compartilhado — exibe somente artefatos já produzidos (sem timeline). */
export function OsWorkspaceContextoOperacional({ ordem }: Props) {
  const etapa = parseOsStage(ordem.etapa_atual);
  const [anexos, setAnexos] = useState<OsAnexoComUrl[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [listaViewOpen, setListaViewOpen] = useState(false);

  const itensSeparacao = ordem.lista_separacao ?? [];
  const clienteNome = ordem.cliente?.nome ?? ordem.titulo;
  const cnc = ordem.anexo_cnc ?? null;
  const installationNotesRaw = (ordem.installation_notes ?? "").trim();
  const installationExecutionNotesRaw = (
    ordem.installation_execution_notes ?? ""
  ).trim();

  // Só faz sentido mostrar contexto quando já passou da visita (commercial exec) ou quando
  // o objetivo é consultar o material para próximas etapas.
  const shouldShow =
    etapa === "financial_review" ||
    etapa === "project" ||
    etapa === "installation" ||
    etapa === "completed";

  useEffect(() => {
    if (!shouldShow) return;
    startTransition(async () => {
      setError(null);
      const r = await listarAnexosVisitaComUrls(ordem.id);
      if (r.error) {
        setError(r.error);
        setAnexos([]);
        return;
      }
      setAnexos(r.anexos as OsAnexoComUrl[]);
    });
  }, [ordem.id, shouldShow]);

  const { images, files } = useMemo(() => {
    const imgs: OsAnexoComUrl[] = [];
    const others: OsAnexoComUrl[] = [];
    for (const a of anexos) {
      if ((a.mime_type ?? "").startsWith("image/")) imgs.push(a);
      else others.push(a);
    }
    return { images: imgs, files: others };
  }, [anexos]);

  const notesRaw = (ordem.anotacoes_tecnicas ?? "").trim();
  const notes =
    etapa === "financial_review" && notesRaw.length > 260
      ? `${notesRaw.slice(0, 259)}…`
      : notesRaw;

  const imagesDisplay = etapa === "financial_review" ? images.slice(0, 3) : images;
  const filesDisplay = etapa === "financial_review" ? files.slice(0, 3) : files;

  const hasAny =
    Boolean(notesRaw) ||
    imagesDisplay.length > 0 ||
    filesDisplay.length > 0 ||
    itensSeparacao.length > 0 ||
    Boolean(cnc) ||
    Boolean(installationNotesRaw) ||
    Boolean(installationExecutionNotesRaw);

  if (!shouldShow) return null;

  return (
    <>
      <section className="rounded-ds-lg border border-cc-border/70 bg-cc-surface px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
              {t("os.workspace.contextTitle")}
            </h2>
            <p className="mt-0.5 text-[11px] font-light text-cc-subtle">
              {t("os.workspace.contextSubtitle")}
            </p>
          </div>
          {pending ? (
            <span className="text-[11px] text-cc-muted">…</span>
          ) : null}
        </div>

        {error ? (
          <p className="mt-3 rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
            {error}
          </p>
        ) : null}

        {!hasAny && !pending ? (
          <p className="mt-3 text-sm font-light text-cc-muted">
            {t("os.workspace.contextEmpty")}
          </p>
        ) : null}

        {notes ? (
          <div className="mt-3 rounded-ds-lg border border-cc-border bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
              {t("os.workspace.contextNotes")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm font-light leading-relaxed text-cc-deep">
              {notes}
            </p>
          </div>
        ) : null}

        {imagesDisplay.length > 0 ? (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
              {t("os.workspace.contextPhotos")}
            </p>
            <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {imagesDisplay.map((a, idx) => (
                <li key={a.id} className="relative aspect-square overflow-hidden rounded-sm border border-cc-border bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewIndex(idx);
                      setPreviewOpen(true);
                    }}
                    className="h-full w-full"
                    aria-label={t("os.workspace.contextOpenPhoto")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.nome_arquivo} className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {itensSeparacao.length > 0 ? (
          <div className="mt-3 rounded-ds-lg border border-cc-border bg-white px-3 py-2.5">
            <OsSeparationListCard
              compact
              count={itensSeparacao.length}
              onVer={() => setListaViewOpen(true)}
            />
          </div>
        ) : null}

        {cnc ? (
          <div className="mt-3 rounded-ds-lg border border-cc-border bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
              {t("os.workspace.contextCnc")}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-light text-cc-ink">
                {cnc.nome_arquivo}
              </p>
              {cnc.url ? (
                <a
                  href={cnc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-sm border border-cc-border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
                >
                  {t("os.workspace.project.cncOpen")}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {installationNotesRaw ? (
          <div className="mt-3 rounded-ds-lg border border-cc-border bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
              {t("os.workspace.contextInstallationNotes")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm font-light leading-relaxed text-cc-deep">
              {installationNotesRaw}
            </p>
          </div>
        ) : null}

        {installationExecutionNotesRaw ? (
          <div className="mt-3 rounded-ds-lg border border-cc-border bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
              {t("os.workspace.contextInstallationExecutionNotes")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm font-light leading-relaxed text-cc-deep">
              {installationExecutionNotesRaw}
            </p>
          </div>
        ) : null}

        {filesDisplay.length > 0 ? (
          <div className="mt-3 rounded-ds-lg border border-cc-border bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
              {t("os.workspace.contextFiles")}
            </p>
            <ul className="mt-2 space-y-2">
              {filesDisplay.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-light text-cc-ink">{f.nome_arquivo}</p>
                    <p className="text-[11px] text-cc-subtle">
                      {formatWorkspaceDateTime(f.criado_em)}
                    </p>
                  </div>
                  {f.url ? (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-sm border border-cc-border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
                    >
                      {t("os.workspace.contextOpenFile")}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        itens={imagesDisplay}
        index={previewIndex}
        onIndex={setPreviewIndex}
      />

      <OsSeparationListModal
        osId={ordem.id}
        clienteNome={clienteNome}
        catalogo={[]}
        itensIniciais={itensSeparacao}
        open={listaViewOpen}
        mode="view"
        onClose={() => setListaViewOpen(false)}
      />
    </>
  );
}

