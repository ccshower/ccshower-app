"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { listarAnexosVisitaComUrls } from "@/app/ordens-servico/visita-comercial-actions";
import {
  OsAmbientesPhotosGrouped,
  useVisitPhotosGrouped,
} from "@/components/ordens-servico/os-ambientes-photos-grouped";
import { OsVisitPhotosPreviewDialog } from "@/components/ordens-servico/os-visit-photos-preview-dialog";
import { OsSeparationListCard } from "@/components/ordens-servico/workspace/os-separation-list-card";
import { OsSeparationListModal } from "@/components/ordens-servico/workspace/os-separation-list-modal";
import { formatWorkspaceDateTime } from "@/components/ordens-servico/workspace/os-workspace-utils";
import { t } from "@/lib/i18n";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import type { OrdemServicoWithRelations, OsAnexoComUrl } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
};

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
  const anexosCnc =
    ordem.anexos_cnc?.length
      ? ordem.anexos_cnc
      : ordem.anexo_cnc
        ? [ordem.anexo_cnc]
        : [];
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

  const ambientes = ordem.ambientes ?? [];
  const { flat: previewPhotos } = useVisitPhotosGrouped(images, ambientes);

  const notesRaw = (ordem.anotacoes_tecnicas ?? "").trim();
  const notes =
    etapa === "financial_review" && notesRaw.length > 260
      ? `${notesRaw.slice(0, 259)}…`
      : notesRaw;

  const filesDisplay = etapa === "financial_review" ? files.slice(0, 3) : files;

  const hasAny =
    Boolean(notesRaw) ||
    previewPhotos.length > 0 ||
    filesDisplay.length > 0 ||
    itensSeparacao.length > 0 ||
    anexosCnc.length > 0 ||
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

        {previewPhotos.length > 0 ? (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
              {t("os.workspace.contextPhotos")}
            </p>
            {ambientes.length > 0 ? (
              <p className="mt-0.5 text-[11px] font-light text-cc-subtle">
                {t("os.workspace.contextPhotosGroupedHint")}
              </p>
            ) : null}
            <div className="mt-2">
              <OsAmbientesPhotosGrouped
                ambientes={ambientes}
                anexos={images}
                variant="buttons"
                onPhotoClick={(_item, flatIndex) => {
                  setPreviewIndex(flatIndex);
                  setPreviewOpen(true);
                }}
              />
            </div>
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

        {anexosCnc.length > 0 ? (
          <div className="mt-3 rounded-ds-lg border border-cc-border bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
              {t("os.workspace.contextCnc")}
            </p>
            <ul className="mt-2 space-y-2">
              {anexosCnc.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-light text-cc-ink">
                    {item.nome_arquivo}
                  </p>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-sm border border-cc-border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
                    >
                      {t("os.workspace.project.cncOpen")}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
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

      <OsVisitPhotosPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        itens={previewPhotos}
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

