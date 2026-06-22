"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import {
  FICHA_IMPORT_POLL_MS,
  fichaImportStatusLabel,
  resolveLatestPdfImportUi,
} from "@/lib/ordens-servico/ficha-import-ui";
import { parsePdfSeparationNotes } from "@/lib/ordens-servico/os-ficha-to-separation-list";
import { t } from "@/lib/i18n";
import type { OrdemServicoWithRelations, OsSeparationListItem } from "@/lib/types/database";

const sectionLabel =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted";

const thClass =
  "px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted";

const tdClass = "px-2 py-2 text-sm font-light text-cc-ink align-top";

const actionBtn =
  "rounded-sm border border-cc-border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light";

type Props = {
  ordem: OrdemServicoWithRelations;
  itens: OsSeparationListItem[];
  onVer?: () => void;
  onEditar?: () => void;
};

/** Lista de separação no Projeto — inclui import do PDF e preview para instalação. */
export function OsSeparationListProjectPanel({
  ordem,
  itens,
  onVer,
  onEditar,
}: Props) {
  const router = useRouter();
  const pdfAnexos =
    ordem.anexos_cnc?.filter((a) => a.mime_type === "application/pdf") ?? [];

  const { pendingLatest, failedLatest, shouldPoll } = useMemo(
    () => resolveLatestPdfImportUi(pdfAnexos, itens.length),
    [pdfAnexos, itens.length],
  );

  useEffect(() => {
    if (!shouldPoll) return;
    const id = window.setInterval(() => router.refresh(), FICHA_IMPORT_POLL_MS);
    return () => window.clearInterval(id);
  }, [shouldPoll, router]);

  const hasItems = itens.length > 0;

  return (
    <div className="rounded-sm border border-cc-border/80 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={sectionLabel}>
            {t("os.workspace.project.separationListTitle")}
          </p>
          <p className="mt-1 text-xs font-light text-cc-muted">
            {t("os.workspace.project.separationListSubtitle")}
          </p>
        </div>
        {hasItems ? (
          <span className="rounded-sm bg-cc-blue-soft/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep">
            {t("os.workspace.project.separationListCount", {
              count: String(itens.length),
            })}
          </span>
        ) : null}
      </div>

      {pendingLatest ? (
        <p className="mt-3 rounded-sm border border-dashed border-cc-border px-3 py-2 text-xs font-light text-cc-muted">
          {pendingLatest.ficha_import_status === "processing"
            ? t("os.workspace.project.fichaImportProcessing")
            : t("os.workspace.project.fichaImportWaiting")}
        </p>
      ) : null}

      {failedLatest ? (
        <p className="mt-3 rounded-sm border border-cc-rose/40 bg-cc-rose/5 px-3 py-2 text-xs font-light text-cc-rose">
          {t("os.workspace.project.fichaImportFailedDetail", {
            file: failedLatest.nome_arquivo,
            status: fichaImportStatusLabel(
              failedLatest.ficha_import_status,
              t,
            ),
            error:
              failedLatest.ficha_import_error ??
              t("os.workspace.project.fichaImportUnknownError"),
          })}
        </p>
      ) : null}

      {!hasItems && !pendingLatest && !failedLatest ? (
        <p className="mt-3 text-sm font-light text-cc-muted">
          {t("os.workspace.project.separationListNoneRegistered")}
        </p>
      ) : null}

      {hasItems ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-cc-border/80">
                <th className={thClass}>{t("os.workspace.project.fichaColQty")}</th>
                <th className={thClass}>{t("os.workspace.project.fichaColSku")}</th>
                <th className={thClass}>{t("os.workspace.project.fichaColGlass")}</th>
                <th className={thClass}>{t("os.workspace.project.fichaColFinish")}</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => {
                const { glass, finish } = parsePdfSeparationNotes(item.notes);
                return (
                  <tr key={item.id} className="border-b border-cc-border/40">
                    <td className={tdClass}>{item.quantity}</td>
                    <td className={`${tdClass} font-medium`}>
                      {item.catalogo_item?.nome ?? "—"}
                    </td>
                    <td className={tdClass}>{glass ?? "—"}</td>
                    <td className={tdClass}>{finish ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
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
