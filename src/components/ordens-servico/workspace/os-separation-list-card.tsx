"use client";

import { t } from "@/lib/i18n";

const sectionLabel =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted";

const actionBtn =
  "rounded-sm border border-cc-border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light";

type Props = {
  count: number;
  onVer?: () => void;
  onEditar?: () => void;
  compact?: boolean;
};

function separationListSummary(count: number, compact?: boolean): string {
  if (count === 0) {
    return t("os.workspace.project.separationListNoneRegistered");
  }
  if (compact) {
    return t("os.workspace.project.separationListRegistered");
  }
  if (count === 1) {
    return t("os.workspace.project.separationListRegisteredOne");
  }
  return t("os.workspace.project.separationListRegisteredCount", {
    count: String(count),
  });
}

/** Resumo operacional da lista — compartilhado entre Projeto e Contexto. */
export function OsSeparationListCard({
  count,
  onVer,
  onEditar,
  compact,
}: Props) {
  const hasItems = count > 0;

  return (
    <div className={compact ? "" : "rounded-sm border border-cc-border/80 bg-white p-3"}>
      {!compact ? (
        <p className={sectionLabel}>
          {t("os.workspace.project.separationList")}
        </p>
      ) : (
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
          {t("os.workspace.contextSeparationList")}
        </p>
      )}
      <p className={`text-sm font-light text-cc-muted ${compact ? "mt-1" : "mt-2"}`}>
        {separationListSummary(count, compact)}
      </p>
      <div className={`flex flex-wrap gap-2 ${compact ? "mt-2" : "mt-3"}`}>
        {hasItems && onVer ? (
          <button type="button" onClick={onVer} className={actionBtn}>
            {t("os.workspace.project.viewList")}
          </button>
        ) : null}
        {onEditar ? (
          <button type="button" onClick={onEditar} className={actionBtn}>
            {hasItems
              ? t("os.workspace.project.editList")
              : t("os.workspace.project.buildList")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
