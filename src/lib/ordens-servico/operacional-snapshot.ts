import type { OrdemServicoStatus } from "@/lib/ordens-servico/constants";
import { tOsOperationalStatus } from "@/lib/i18n";
import {
  OS_WORKFLOW_STAGES,
  parseOsWorkflowStage,
  type OsWorkflowStage,
} from "@/lib/ordens-servico/workflow";
import {
  LEGACY_OPERATIONAL_STATUS,
  normalizeLegacyKey,
} from "@/lib/operational/legacy-keys";

export const OS_ETAPA = OS_WORKFLOW_STAGES;
export type OsEtapa = OsWorkflowStage;

export const OS_OPERATIONAL_STATUS = [
  "no_visit",
  "visit_scheduled",
  "visit_in_progress",
  "commercial_pending",
  "financial_pending",
  "financial_in_progress",
  "financial_blocked",
  "project_pending",
  "project_in_progress",
  "installation_scheduled",
  "installation_in_progress",
  "installation_pending",
  "completed",
  "cancelled",
] as const;

export type OsOperationalStatus = (typeof OS_OPERATIONAL_STATUS)[number];

/** @deprecated */
export const OS_STATUS_OPERACIONAL = OS_OPERATIONAL_STATUS;
/** @deprecated */
export type OsStatusOperacional = OsOperationalStatus;

export function parseOsStage(raw: string | null | undefined): OsWorkflowStage {
  return parseOsWorkflowStage(raw) ?? "commercial";
}

/** @deprecated */
export const parseOsEtapa = parseOsStage;

export function parseOsOperationalStatus(
  raw: string | null | undefined,
): OsOperationalStatus {
  const v = normalizeLegacyKey(
    raw,
    LEGACY_OPERATIONAL_STATUS,
    OS_OPERATIONAL_STATUS,
    "commercial_pending",
  );
  return v as OsOperationalStatus;
}

/** @deprecated */
export const parseOsStatusOperacional = parseOsOperationalStatus;

export function resolveOperationalStatus(
  stage: OsWorkflowStage,
  orderStatus: OrdemServicoStatus,
): OsOperationalStatus {
  if (orderStatus === "completed") return "completed";
  if (orderStatus === "cancelled") return "cancelled";

  switch (stage) {
    case "commercial":
      if (orderStatus === "open") return "no_visit";
      if (orderStatus === "scheduled") return "visit_scheduled";
      if (orderStatus === "in_progress") return "visit_in_progress";
      return "commercial_pending";
    case "financial_review":
      return orderStatus === "in_progress"
        ? "financial_in_progress"
        : "financial_pending";
    case "blocked":
      return "financial_blocked";
    case "project":
      return orderStatus === "in_progress"
        ? "project_in_progress"
        : "project_pending";
    case "installation":
      if (orderStatus === "scheduled") return "installation_scheduled";
      if (orderStatus === "in_progress") return "installation_in_progress";
      return "installation_pending";
    case "completed":
      return "completed";
    default:
      return "commercial_pending";
  }
}

/** @deprecated */
export const resolverStatusAtual = resolveOperationalStatus;

export type OperationalSnapshot = {
  equipe_atual_id: string;
  etapa_atual: OsWorkflowStage;
  status_atual: OsOperationalStatus;
};

/** @deprecated */
export type SnapshotOperacional = OperationalSnapshot;

export function buildOperationalSnapshot(
  equipeId: string,
  stage: OsWorkflowStage,
  orderStatus: OrdemServicoStatus,
): OperationalSnapshot {
  return {
    equipe_atual_id: equipeId,
    etapa_atual: stage,
    status_atual: resolveOperationalStatus(stage, orderStatus),
  };
}

/** @deprecated */
export const buildSnapshotOperacional = buildOperationalSnapshot;

export function labelOperationalStatus(
  statusAtual: string | null | undefined,
): string {
  const code = parseOsOperationalStatus(statusAtual);
  return tOsOperationalStatus(code);
}

/** @deprecated */
export const labelStatusOperacional = labelOperationalStatus;
