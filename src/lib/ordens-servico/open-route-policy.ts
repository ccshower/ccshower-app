import { hasValidSmsConsent } from "@/lib/clientes/sms-consent";
import { toE164Phone } from "@/lib/sms/e164";
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

/** O botão "Enviar aviso" dispara ETA + SMS ao cliente nestas etapas. */
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

export const CLIENT_ETA_SMS_DEDUPE_MS = 20 * 60_000;

export function clientEtaSmsDedupeSince(nowMs: number): string {
  return new Date(nowMs - CLIENT_ETA_SMS_DEDUPE_MS).toISOString();
}

export function recentClientEtaSmsBlocks(recentCount: number): boolean {
  return recentCount > 0;
}

export type ClientEtaSmsDecision =
  | { queue: false; message?: string }
  | {
      queue: true;
      telefone: string;
      event: OpenRouteEvent;
      etapa: "commercial" | "installation";
    };

/** Decide o SMS antes do webhook. Consentimento inválido nunca entra na fila. */
export function decideClientEtaSms(input: ClientEtaSmsEligibility & {
  telefone: string | null | undefined;
}): ClientEtaSmsDecision {
  const stageAllowsSms = clientEtaStageAllowsSms(input);
  if (!shouldSendClientEtaSms(input)) {
    if (!stageAllowsSms && input.stage === "commercial") {
      return { queue: false, message: "Visit not in progress" };
    }
    if (stageAllowsSms) {
      return { queue: false, message: "Customer has not authorized SMS" };
    }
    return { queue: false };
  }

  if (input.stage !== "commercial" && input.stage !== "installation") {
    return { queue: false };
  }

  const rawPhone = input.telefone?.trim() ?? "";
  if (!rawPhone) {
    return { queue: false, message: "Customer phone missing" };
  }

  const telefone = toE164Phone(rawPhone);
  if (!telefone) {
    return { queue: false, message: "Customer phone invalid" };
  }

  return {
    queue: true,
    telefone,
    event: openRouteEventForStage(input.stage),
    etapa: input.stage,
  };
}
