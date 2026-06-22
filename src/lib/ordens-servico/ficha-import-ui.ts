import type { FichaImportStatus, OsAnexoComUrl } from "@/lib/types/database";

export const FICHA_IMPORT_POLL_MS = 5000;

export function sortPdfAnexosDesc(anexos: OsAnexoComUrl[]): OsAnexoComUrl[] {
  return [...anexos].sort(
    (a, b) =>
      new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
  );
}

/** Status de import só do PDF mais recente. */
export function resolveLatestPdfImportUi(
  pdfAnexos: OsAnexoComUrl[],
  separationItemCount: number,
): {
  latestPdf: OsAnexoComUrl | null;
  pendingLatest: OsAnexoComUrl | null;
  failedLatest: OsAnexoComUrl | null;
  shouldPoll: boolean;
} {
  const sorted = sortPdfAnexosDesc(pdfAnexos);
  const latestPdf = sorted[0] ?? null;

  if (separationItemCount > 0 || !latestPdf) {
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

export function fichaImportStatusLabel(
  status: FichaImportStatus | null | undefined,
  t: (key: string) => string,
): string {
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
