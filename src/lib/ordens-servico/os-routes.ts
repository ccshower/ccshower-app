/** Lista completa de OS — todas etapas e status (inclui finalizadas). */
export function ordensServicoListPath(): string {
  return "/ordens-servico";
}

/** Workspace operacional de uma OS existente (não é criação). */
export function osWorkspacePath(id: string): string {
  return `/os/${id}`;
}
