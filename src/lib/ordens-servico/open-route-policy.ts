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
