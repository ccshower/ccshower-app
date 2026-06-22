"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { t } from "@/lib/i18n";
import type {
  FichaImportStatus,
  OrdemServicoWithRelations,
  OsAnexoComUrl,
  OsFichaTecnicaItem,
} from "@/lib/types/database";

const sectionLabel =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted";

const thClass =
  "px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted";

const tdClass = "px-2 py-2 text-sm font-light text-cc-ink align-top";

type Props = {
  ordem: OrdemServicoWithRelations;
};

function ambienteNome(
  ordem: OrdemServicoWithRelations,
  osAmbienteId: string | null,
): string | null {
  if (!osAmbienteId) return null;
  return ordem.ambientes?.find((a) => a.id === osAmbienteId)?.nome ?? null;
}

function importStatusLabel(status: FichaImportStatus | null | undefined): string {
  switch (status) {
    case "pending":
      return t("os.workspace.project.fichaImportPending");
    case "processing":
      return t("os.workspace.project.fichaImportProcessing");
    case "completed":
      return t("os.workspace.project.fichaImportCompleted");
    case "failed":
      return t("os.workspace.project.fichaImportFailed");
    case "skipped":
      return t("os.workspace.project.fichaImportSkipped");
    default:
      return "";
  }
}

function groupItemsByAmbiente(items: OsFichaTecnicaItem[], ordem: OrdemServicoWithRelations) {
  const groups = new Map<string, { label: string; items: OsFichaTecnicaItem[] }>();
  for (const item of items) {
    const key = item.os_ambiente_id ?? "__none__";
    const label =
      ambienteNome(ordem, item.os_ambiente_id) ??
      t("os.workspace.project.fichaAmbienteGeral");
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, { label, items: [item] });
    }
  }
  return [...groups.values()];
}

const FICHA_IMPORT_POLL_MS = 5000;

function sortPdfAnexosDesc(anexos: OsAnexoComUrl[]): OsAnexoComUrl[] {
  return [...anexos].sort(
    (a, b) =>
      new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
  );
}

/** Status de import só do PDF mais recente — evita misturar falhas de testes anteriores. */
function resolveLatestImportUi(
  pdfAnexos: OsAnexoComUrl[],
  itemCount: number,
): {
  latestPdf: OsAnexoComUrl | null;
  pendingLatest: OsAnexoComUrl | null;
  failedLatest: OsAnexoComUrl | null;
  shouldPoll: boolean;
} {
  const sorted = sortPdfAnexosDesc(pdfAnexos);
  const latestPdf = sorted[0] ?? null;

  if (itemCount > 0 || !latestPdf) {
    return {
      latestPdf,
      pendingLatest: null,
      failedLatest: null,
      shouldPoll: false,
    };
  }

  const status = latestPdf.ficha_import_status;
  const pendingLatest =
    status === "pending" || status === "processing" ? latestPdf : null;
  const failedLatest = status === "failed" ? latestPdf : null;

  return {
    latestPdf,
    pendingLatest,
    failedLatest,
    shouldPoll: pendingLatest != null,
  };
}

/** Ficha técnica (hardware) extraída do PDF de projeto via N8N. */
export function OsFichaTecnicaPanel({ ordem }: Props) {
  const router = useRouter();
  const items = ordem.ficha_tecnica ?? [];
  const pdfAnexos =
    ordem.anexos_cnc?.filter((a) => a.mime_type === "application/pdf") ?? [];

  const { pendingLatest, failedLatest, shouldPoll } = useMemo(
    () => resolveLatestImportUi(pdfAnexos, items.length),
    [pdfAnexos, items.length],
  );

  useEffect(() => {
    if (!shouldPoll) return;
    const id = window.setInterval(() => router.refresh(), FICHA_IMPORT_POLL_MS);
    return () => window.clearInterval(id);
  }, [shouldPoll, router]);

  const groups = groupItemsByAmbiente(items, ordem);

  return (
    <div className="rounded-sm border border-cc-border/80 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={sectionLabel}>{t("os.workspace.project.fichaTecnicaTitle")}</p>
          <p className="mt-1 text-xs font-light text-cc-muted">
            {t("os.workspace.project.fichaTecnicaSubtitle")}
          </p>
        </div>
        {items.length > 0 ? (
          <span className="rounded-sm bg-cc-blue-soft/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep">
            {t("os.workspace.project.fichaTecnicaCount", {
              count: String(items.length),
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
            status: importStatusLabel(failedLatest.ficha_import_status),
            error:
              failedLatest.ficha_import_error ??
              t("os.workspace.project.fichaImportUnknownError"),
          })}
        </p>
      ) : null}

      {items.length === 0 && !pendingLatest && !failedLatest ? (
        <p className="mt-3 text-sm font-light text-cc-muted">
          {t("os.workspace.project.fichaTecnicaEmpty")}
        </p>
      ) : null}

      {groups.map((group) => (
        <div key={group.label} className="mt-4">
          <p className="mb-2 text-xs font-semibold text-cc-deep">{group.label}</p>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-cc-border/80">
                  <th className={thClass}>{t("os.workspace.project.fichaColQty")}</th>
                  <th className={thClass}>{t("os.workspace.project.fichaColSku")}</th>
                  <th className={thClass}>{t("os.workspace.project.fichaColGlass")}</th>
                  <th className={thClass}>{t("os.workspace.project.fichaColFinish")}</th>
                  <th className={thClass}>{t("os.workspace.project.fichaColSection")}</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.id} className="border-b border-cc-border/40">
                    <td className={tdClass}>{item.quantity}</td>
                    <td className={`${tdClass} font-medium`}>{item.sku}</td>
                    <td className={tdClass}>{item.glass_spec ?? "—"}</td>
                    <td className={tdClass}>{item.finish ?? "—"}</td>
                    <td className={tdClass}>{item.section}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
