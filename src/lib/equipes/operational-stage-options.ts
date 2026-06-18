import { tOsStage } from "@/lib/i18n";
import {
  OS_STAGE_TEAM_CODE,
} from "@/lib/ordens-servico/workflow";
import {
  equipeMatchesStage,
  normalizeTeamCode,
} from "@/lib/ordens-servico/workflow-equipe";

/** Active pipeline stages assignable to a team (`equipes.codigo_operacional`). */
export const OPERATIONAL_STAGE_CODES = Object.keys(
  OS_STAGE_TEAM_CODE,
) as Array<keyof typeof OS_STAGE_TEAM_CODE>;

export type OperationalStageCode = (typeof OPERATIONAL_STAGE_CODES)[number];

export function parseOperationalStageCode(
  raw: string | null | undefined,
): OperationalStageCode | null {
  const normalized = normalizeTeamCode(raw);
  if (!normalized) return null;
  return OPERATIONAL_STAGE_CODES.includes(normalized as OperationalStageCode)
    ? (normalized as OperationalStageCode)
    : null;
}

export function operationalStageLabel(
  code: string | null | undefined,
): string {
  const parsed = parseOperationalStageCode(code);
  if (!parsed) return "Not set";
  return tOsStage(parsed);
}

export function operationalStageOptions(): Array<{
  value: OperationalStageCode;
  label: string;
}> {
  return OPERATIONAL_STAGE_CODES.map((value) => ({
    value,
    label: tOsStage(value),
  }));
}

export function inferOperationalStageFromTeamName(
  nome: string,
): OperationalStageCode | null {
  const row = { nome, ativo: true, codigo_operacional: null as string | null };
  const stages: OperationalStageCode[] = [
    "commercial",
    "financial_review",
    "project",
    "installation",
  ];
  for (const stage of stages) {
    if (equipeMatchesStage(row, stage)) {
      return stage;
    }
  }
  return null;
}
