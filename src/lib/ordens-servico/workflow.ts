/**
 * Máquina de estados operacional da OS.
 * Chaves persistidas em inglês (snake_case).
 *
 * Pipeline: commercial → financial_review → project → installation → completed
 * Ramificação: financial_review → blocked
 */

import type { OrdemServicoStatus } from "@/lib/ordens-servico/constants";
import { formatStageTransition } from "@/lib/i18n";
import {
  LEGACY_OS_STAGE,
  normalizeLegacyKey,
} from "@/lib/operational/legacy-keys";

export const OS_WORKFLOW_STAGES = [
  "commercial",
  "financial_review",
  "project",
  "installation",
  "blocked",
  "completed",
] as const;

export type OsWorkflowStage = (typeof OS_WORKFLOW_STAGES)[number];

/** @deprecated Use OsWorkflowStage */
export type OsWorkflowEtapa = OsWorkflowStage;

/** @deprecated Use OS_WORKFLOW_STAGES */
export const OS_WORKFLOW_ETAPAS = OS_WORKFLOW_STAGES;

export const OS_ACTIVE_STAGES: OsWorkflowStage[] = [
  "commercial",
  "financial_review",
  "project",
  "installation",
  "blocked",
];

/** Código em equipes.codigo_operacional */
export const OS_STAGE_TEAM_CODE: Record<
  Exclude<OsWorkflowStage, "blocked" | "completed">,
  string
> = {
  commercial: "commercial",
  financial_review: "financial_review",
  project: "project",
  installation: "installation",
};

/** @deprecated Use OS_STAGE_TEAM_CODE */
export const OS_ETAPA_CODIGO_EQUIPE = OS_STAGE_TEAM_CODE;

export const OS_WORKFLOW_TRANSITIONS: Record<
  OsWorkflowStage,
  readonly OsWorkflowStage[]
> = {
  commercial: ["financial_review"],
  financial_review: ["project", "blocked"],
  project: ["installation"],
  installation: ["completed"],
  blocked: ["financial_review"],
  completed: [],
};

/** @deprecated */
export const OS_WORKFLOW_TRANSICOES = OS_WORKFLOW_TRANSITIONS;

export type OsWorkflowTransition = {
  from: OsWorkflowStage;
  to: OsWorkflowStage;
};

export function parseOsWorkflowStage(
  raw: string | null | undefined,
): OsWorkflowStage | null {
  const v = normalizeLegacyKey(
    raw,
    LEGACY_OS_STAGE,
    OS_WORKFLOW_STAGES,
    "",
  );
  return v ? (v as OsWorkflowStage) : null;
}

/** @deprecated Use parseOsWorkflowStage */
export const parseOsWorkflowEtapa = parseOsWorkflowStage;

export function stageIsTerminal(stage: OsWorkflowStage): boolean {
  return stage === "completed";
}

/** @deprecated */
export const etapaEhTerminal = stageIsTerminal;

export function allowedTransitions(
  current: OsWorkflowStage,
): OsWorkflowStage[] {
  return [...OS_WORKFLOW_TRANSITIONS[current]];
}

export function transitionAllowed(
  from: OsWorkflowStage,
  to: OsWorkflowStage,
): boolean {
  return OS_WORKFLOW_TRANSITIONS[from].includes(to);
}

export function listTransitionOptions(
  current: OsWorkflowStage,
): OsWorkflowTransition[] {
  return allowedTransitions(current).map((to) => ({ from: current, to }));
}

/** @deprecated */
export const listarOpcoesTransicao = (
  etapa: OsWorkflowStage,
): { de: OsWorkflowStage; para: OsWorkflowStage }[] =>
  listTransitionOptions(etapa).map((o) => ({ de: o.from, para: o.to }));

export function orderStatusOnEnterStage(
  stage: OsWorkflowStage,
): OrdemServicoStatus {
  switch (stage) {
    case "commercial":
      return "in_progress";
    case "financial_review":
    case "project":
    case "installation":
    case "blocked":
      return "in_progress";
    case "completed":
      return "completed";
    default:
      return "in_progress";
  }
}

/** @deprecated */
export const statusOrdemAoEntrarEtapa = orderStatusOnEnterStage;

export type StageTransitionContext = {
  ordemServicoId: string;
  clienteId: string;
  stagePrevious: OsWorkflowStage;
  stageNew: OsWorkflowStage;
  usuarioId: string;
  equipeId: string;
  force: boolean;
  motivo?: string | null;
};

/** @deprecated */
export type EtapaTransitionContext = StageTransitionContext & {
  etapaAnterior: OsWorkflowStage;
  etapaNova: OsWorkflowStage;
  forcar: boolean;
};

export function prepareStageTransitionNotifications(
  _ctx: StageTransitionContext,
): void {
  /* extensão: SMS / WhatsApp */
}

/** @deprecated */
export const prepareEtapaTransitionNotifications = (
  ctx: EtapaTransitionContext,
) =>
  prepareStageTransitionNotifications({
    ordemServicoId: ctx.ordemServicoId,
    clienteId: ctx.clienteId,
    stagePrevious: ctx.etapaAnterior,
    stageNew: ctx.etapaNova,
    usuarioId: ctx.usuarioId,
    equipeId: ctx.equipeId,
    force: ctx.forcar,
    motivo: ctx.motivo,
  });

/** Descrição neutra para auditoria (chaves EN, sem tradução). */
export function auditStageChangeDescription(
  ctx: Pick<StageTransitionContext, "stagePrevious" | "stageNew" | "force" | "motivo">,
): string {
  const base = formatStageTransition(ctx.stagePrevious, ctx.stageNew);
  if (ctx.force) {
    return ctx.motivo?.trim()
      ? `[admin] ${base} — ${ctx.motivo.trim()}`
      : `[admin] ${base}`;
  }
  return base;
}

/** @deprecated */
export function descricaoAuditoriaMudancaEtapa(ctx: EtapaTransitionContext): string {
  return auditStageChangeDescription({
    stagePrevious: ctx.etapaAnterior,
    stageNew: ctx.etapaNova,
    force: ctx.forcar,
    motivo: ctx.motivo,
  });
}
