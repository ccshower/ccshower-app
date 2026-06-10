import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";

/** Status operacionais que representam OS ativa na fila Projeto. */
export const PROJECT_QUEUE_STATUSES = [
  "project_pending",
  "project_in_progress",
] as const;

export type ProjectQueueStatus = (typeof PROJECT_QUEUE_STATUSES)[number];

const PROJECT_QUEUE_SET = new Set<string>(PROJECT_QUEUE_STATUSES);

/** OS na etapa Projeto aguardando ou em execução (fila operacional real). */
export function isOsNaFilaProjeto(row: {
  etapa_atual: string | null | undefined;
  status_atual?: string | null;
}): boolean {
  if (parseOsStage(row.etapa_atual) !== "project") return false;
  const status = row.status_atual ?? "";
  return PROJECT_QUEUE_SET.has(status);
}
