import { hasValidSmsConsent } from "@/lib/clientes/sms-consent";
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
  smsAutorizado: boolean | null | undefined;
  smsConsentimentoEm: string | null | undefined;
  smsOptOutEm: string | null | undefined;
};

/** Etapa e status permitem ETA, antes da verificação de consentimento. */
export function clientEtaStageAllowsSms({
  stage,
  statusAtual,
  osStatus,
}: Pick<
  ClientEtaSmsEligibility,
  "stage" | "statusAtual" | "osStatus"
>): boolean {
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

/** SMS ETA só com etapa válida e consentimento posterior a qualquer opt-out. */
export function shouldSendClientEtaSms(
  eligibility: ClientEtaSmsEligibility,
): boolean {
  if (!clientEtaStageAllowsSms(eligibility)) return false;
  return hasValidSmsConsent({
    smsAutorizado: eligibility.smsAutorizado,
    smsConsentimentoEm: eligibility.smsConsentimentoEm,
    smsOptOutEm: eligibility.smsOptOutEm,
  });
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
