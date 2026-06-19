"use client";

import { OsAmbientesPhotosGrouped } from "@/components/ordens-servico/os-ambientes-photos-grouped";
import { t } from "@/lib/i18n";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

/** Read-only visit photos grouped by environment (project stage). */
export function OsAmbientesVisitPhotosProject({
  ordem,
}: {
  ordem: OrdemServicoWithRelations;
}) {
  const ambientes = ordem.ambientes ?? [];
  const anexos = ordem.anexos_visita ?? [];

  if (anexos.length === 0) {
    return (
      <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
        <p className={sectionLabel}>{t("os.workspace.project.visitPhotosTitle")}</p>
        <p className="mt-2 text-sm text-cc-muted">
          {t("os.workspace.project.visitPhotosNone")}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
      <p className={sectionLabel}>{t("os.workspace.project.visitPhotosTitle")}</p>
      <p className="mt-1 text-xs font-light text-cc-muted">
        {t("os.workspace.project.visitPhotosHint")}
      </p>
      <div className="mt-3">
        <OsAmbientesPhotosGrouped
          ambientes={ambientes}
          anexos={anexos}
          variant="links"
          showEmptyAmbientes={ambientes.length > 0}
        />
      </div>
    </section>
  );
}

const sectionLabel =
  "text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted";
