"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { listarAnexosVisitaComUrls } from "@/app/ordens-servico/visita-comercial-actions";
import {
  OsAmbientesPhotosGrouped,
  useVisitPhotosGrouped,
} from "@/components/ordens-servico/os-ambientes-photos-grouped";
import { OsVisitPhotosPreviewDialog } from "@/components/ordens-servico/os-visit-photos-preview-dialog";
import { t } from "@/lib/i18n";
import type { OrdemServicoWithRelations, OsAnexoComUrl } from "@/lib/types/database";

const sectionLabel =
  "text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted";

/** Read-only visit photos grouped by environment (project stage). */
export function OsAmbientesVisitPhotosProject({
  ordem,
}: {
  ordem: OrdemServicoWithRelations;
}) {
  const ambientes = ordem.ambientes ?? [];
  const [anexos, setAnexos] = useState<OsAnexoComUrl[]>(ordem.anexos_visita ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    startTransition(async () => {
      setError(null);
      const r = await listarAnexosVisitaComUrls(ordem.id);
      if (r.error) {
        setError(r.error);
        return;
      }
      setAnexos(r.anexos as OsAnexoComUrl[]);
    });
  }, [ordem.id]);

  const images = useMemo(
    () => anexos.filter((a) => (a.mime_type ?? "").startsWith("image/")),
    [anexos],
  );

  const { flat: previewPhotos } = useVisitPhotosGrouped(images, ambientes);

  return (
    <>
      <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={sectionLabel}>{t("os.workspace.project.visitPhotosTitle")}</p>
            <p className="mt-1 text-xs font-light text-cc-muted">
              {t("os.workspace.project.visitPhotosHint")}
            </p>
          </div>
          {pending ? <span className="text-[11px] text-cc-muted">…</span> : null}
        </div>

        {error ? (
          <p className="mt-3 rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
            {error}
          </p>
        ) : null}

        {!pending && previewPhotos.length === 0 ? (
          <p className="mt-3 text-sm text-cc-muted">
            {t("os.workspace.project.visitPhotosNone")}
          </p>
        ) : null}

        {previewPhotos.length > 0 ? (
          <div className="mt-3">
            <OsAmbientesPhotosGrouped
              ambientes={ambientes}
              anexos={images}
              variant="buttons"
              showEmptyAmbientes={ambientes.length > 0}
              onPhotoClick={(_item, flatIndex) => {
                setPreviewIndex(flatIndex);
                setPreviewOpen(true);
              }}
            />
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
    </>
  );
}
