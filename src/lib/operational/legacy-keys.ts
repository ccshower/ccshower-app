/**
 * Mapa legado PT → EN (leitura de dados pré-migração / formulários antigos).
 * Não usar para persistência.
 */

export const LEGACY_CLIENT_TYPE: Record<string, string> = {
  RESIDENCIAL: "residential",
  CONSTRUTORA: "construction_company",
  ARQUITETO: "architect",
  PARCEIRO: "partner",
  COMERCIAL: "commercial",
  OUTRO: "other",
};

export const LEGACY_OS_STAGE: Record<string, string> = {
  comercial: "commercial",
  financeiro: "financial_review",
  projeto: "project",
  instalacao: "installation",
  bloqueado: "blocked",
  concluida: "completed",
};

export const LEGACY_OS_STATUS: Record<string, string> = {
  aberta: "open",
  agendada: "scheduled",
  em_andamento: "in_progress",
  concluida: "completed",
  cancelada: "cancelled",
};

export const LEGACY_EVENT_TYPE: Record<string, string> = {
  visita_tecnica: "technical_visit",
  medicao: "measurement",
  mudanca_etapa: "stage_changed",
  mudanca_status: "status_changed",
  os_criada: "os_created",
  outro: "other",
};

export const LEGACY_EVENT_STATUS: Record<string, string> = {
  agendado: "scheduled",
  confirmado: "confirmed",
  em_campo: "on_site",
  concluido: "completed",
  cancelado: "cancelled",
};

export const LEGACY_OPERATIONAL_STATUS: Record<string, string> = {
  visita_agendada: "visit_scheduled",
  visita_em_andamento: "visit_in_progress",
  comercial_pendente: "commercial_pending",
  financeiro_pendente: "financial_pending",
  financeiro_em_andamento: "financial_in_progress",
  financeiro_bloqueado: "financial_blocked",
  projeto_pendente: "project_pending",
  projeto_em_andamento: "project_in_progress",
  instalacao_agendada: "installation_scheduled",
  instalacao_em_andamento: "installation_in_progress",
  instalacao_pendente: "installation_pending",
};

export const LEGACY_TEAM_CODE: Record<string, string> = {
  comercial: "commercial",
  financeiro: "financial_review",
  projeto: "project",
  instalacao: "installation",
};

export function normalizeLegacyKey(
  raw: string | null | undefined,
  map: Record<string, string>,
  allowed: readonly string[],
  fallback: string,
): string {
  const v = String(raw ?? "").trim();
  if (!v) return fallback;
  const lower = v.toLowerCase();
  if (allowed.includes(lower)) return lower;
  const fromLegacy = map[v] ?? map[v.toUpperCase()] ?? map[lower];
  if (fromLegacy && allowed.includes(fromLegacy)) return fromLegacy;
  return fallback;
}
