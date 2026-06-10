"use client";

import { t } from "@/lib/i18n";
import { countSeparationConference } from "@/lib/ordens-servico/installation-workspace";
import type { OsSeparationListItem } from "@/lib/types/database";

const sectionLabel =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted";

const actionBtn =
  "rounded-sm border border-cc-border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light";

type Props = {
  itens: OsSeparationListItem[];
  onConferir: () => void;
};

/** Resumo da lista de separação na etapa Instalação. */
export function OsInstallationSeparationCard({ itens, onConferir }: Props) {
  const { total, checked, allChecked } = countSeparationConference(itens);

  return (
    <section className="rounded-sm border border-cc-border/80 bg-white p-3">
      <p className={sectionLabel}>
        {t("os.workspace.installation.checklistTitle")}
      </p>

      {total === 0 ? (
        <p className="mt-2 text-sm font-light text-cc-muted">
          {t("os.workspace.installation.checklistEmpty")}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm font-light text-cc-muted">
            {total === 1
              ? t("os.workspace.project.separationListRegisteredOne")
              : t("os.workspace.project.separationListRegisteredCount", {
                  count: String(total),
                })}
          </p>
          {checked > 0 ? (
            <p
              className={`mt-1 text-sm font-medium ${allChecked ? "text-emerald-700" : "text-cc-deep"}`}
            >
              {allChecked
                ? t("os.workspace.installation.listChecked")
                : t("os.workspace.installation.itemsCheckedProgress", {
                    checked: String(checked),
                    total: String(total),
                  })}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onConferir}
            className={`mt-3 ${actionBtn}`}
          >
            {t("os.workspace.installation.conferenceList")}
          </button>
        </>
      )}
    </section>
  );
}
