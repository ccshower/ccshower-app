import type { OrdemServicoStatus } from "./constants";

export const OS_OPEN_STATUSES: OrdemServicoStatus[] = [
  "open",
  "scheduled",
  "in_progress",
];

/** @deprecated */
export const OS_STATUS_ABERTA = OS_OPEN_STATUSES;

export function isOsOpen(status: OrdemServicoStatus): boolean {
  return OS_OPEN_STATUSES.includes(status);
}

/** @deprecated */
export const isOsAberta = isOsOpen;
