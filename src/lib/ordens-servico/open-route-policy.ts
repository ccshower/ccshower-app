import {
  parseOrdemServicoStatus,
} from "@/lib/ordens-servico/constants";
import {
  parseOsOperationalStatus,
  type OsOperationalStatus,
} from "@/lib/ordens-servico/operacional-snapshot";
import type { OsWorkflowStage } from "@/lib/ordens-servico/workflow";

const SMS_STAGES: ReadonlySet<OsWorkflowStage> = new Set([
  "commercial",
  "installation",
]);

/** Open route dispara ETA + SMS ao cliente nestas etapas. */
export function stageTriggersClientEtaSms(
  stage: OsWorkflowStage | null,
): boolean {
  return stage != null && SMS_STAGES.has(stage);
}

type ClientEtaSmsEligibility = {
  stage: OsWorkflowStage | null;
  statusAtual: string | null | undefined;
  osStatus: string | null | undefined;
};

/** SMS ETA somente para visita comercial ativa ou instalação não encerrada. */
export function shouldSendClientEtaSms({
  stage,
  statusAtual,
  osStatus,
}: ClientEtaSmsEligibility): boolean {
  if (!stageTriggersClientEtaSms(stage)) return false;

  const orderStatus = parseOrdemServicoStatus(osStatus);
  if (orderStatus === "completed" || orderStatus === "cancelled") return false;

  if (stage === "installation") return true;

  const operationalStatus: OsOperationalStatus =
    parseOsOperationalStatus(statusAtual);
  return (
    operationalStatus === "visit_scheduled" ||
    operationalStatus === "visit_in_progress"
  );
}

export type OpenRouteEvent =
  | "technical_visit_open_route"
  | "installer_open_route";

export function openRouteEventForStage(
  stage: OsWorkflowStage,
): OpenRouteEvent {
  return stage === "commercial"
    ? "technical_visit_open_route"
    : "installer_open_route";
}
