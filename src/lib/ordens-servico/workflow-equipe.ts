import type { SupabaseClient } from "@supabase/supabase-js";

import {
  LEGACY_TEAM_CODE,
  normalizeLegacyKey,
} from "@/lib/operational/legacy-keys";
import {
  OS_STAGE_TEAM_CODE,
  OS_WORKFLOW_STAGES,
  parseOsWorkflowStage,
  type OsWorkflowStage,
} from "@/lib/ordens-servico/workflow";

type EquipeRow = { id: string; codigo_operacional: string | null; nome: string };

export async function resolveDefaultTeamForStage(
  supabase: SupabaseClient,
  stage: OsWorkflowStage,
  fallbackTeamId: string | null,
): Promise<{ equipeId: string | null; error?: string }> {
  if (stage === "blocked" || stage === "completed") {
    return { equipeId: fallbackTeamId };
  }

  const codigo = OS_STAGE_TEAM_CODE[stage];

  const { data: porCodigo, error: codErr } = await supabase
    .from("equipes")
    .select("id, codigo_operacional, nome")
    .eq("codigo_operacional", codigo)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (codErr) return { equipeId: null, error: codErr.message };
  if (porCodigo?.id) return { equipeId: porCodigo.id };

  const { data: todas, error: allErr } = await supabase
    .from("equipes")
    .select("id, codigo_operacional, nome")
    .eq("ativo", true);

  if (allErr) return { equipeId: null, error: allErr.message };

  const lista = (todas ?? []) as EquipeRow[];
  const porNome = lista.find((e) => equipeMatchesStage(e, stage));
  if (porNome?.id) return { equipeId: porNome.id };

  if (fallbackTeamId) return { equipeId: fallbackTeamId };

  return {
    equipeId: null,
    error: `No active team with codigo_operacional "${codigo}".`,
  };
}

/** @deprecated */
export const resolverEquipePadraoEtapa = resolveDefaultTeamForStage;

export function normalizePersistedStage(
  raw: string | null | undefined,
): OsWorkflowStage {
  return parseOsWorkflowStage(raw) ?? "commercial";
}

/** @deprecated */
export const normalizarEtapaPersistida = normalizePersistedStage;

export function normalizeTeamCode(
  raw: string | null | undefined,
): string | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  const allowed = Object.values(OS_STAGE_TEAM_CODE);
  if (allowed.includes(v)) return v;
  return LEGACY_TEAM_CODE[v] ?? null;
}

type EquipeStageRow = {
  id?: string;
  ativo?: boolean;
  codigo_operacional?: string | null;
  nome?: string | null;
};

/** Normaliza texto para comparação (sem acentos, minúsculas). */
function normalizeTeamText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Palavras no nome da equipe que indicam etapa commercial (ex.: SALES). */
const COMMERCIAL_TEAM_NAME_HINTS = [
  "commercial",
  "comercial",
  "sales",
  "vendas",
] as const;

function teamNameMatchesStage(nome: string, stage: OsWorkflowStage): boolean {
  if (stage === "blocked" || stage === "completed") return false;

  const normalized = normalizeTeamText(nome);
  if (!normalized) return false;

  const expected = OS_STAGE_TEAM_CODE[stage];

  if (expected === "commercial") {
    return COMMERCIAL_TEAM_NAME_HINTS.some((hint) => normalized.includes(hint));
  }

  const needle = expected.replace("_", " ");
  if (normalized.includes(normalizeTeamText(needle))) return true;
  if (normalized.includes(normalizeTeamText(expected.split("_")[0] ?? expected))) {
    return true;
  }

  const legacyPt = Object.entries(LEGACY_TEAM_CODE).find(
    ([, v]) => v === expected,
  )?.[0];
  if (legacyPt && normalized.includes(normalizeTeamText(legacyPt))) return true;

  // Ex.: "Instalação A" — codigo_operacional pode ser null em equipes homônimas
  if (expected === "installation" && normalized.includes("instal")) return true;

  return false;
}

export type EquipeStageFilterDebug = {
  stage: OsWorkflowStage;
  expectedCode: string;
  inputTotal: number;
  matchedTotal: number;
  rows: Array<{
    id?: string;
    nome?: string | null;
    codigo_operacional?: string | null;
    ativo?: boolean;
    matched: boolean;
    matchReason?: string;
  }>;
};

function describeEquipeStageMatch(
  equipe: EquipeStageRow,
  stage: OsWorkflowStage,
): { matched: boolean; reason?: string } {
  if (!equipe.ativo) return { matched: false, reason: "inativa" };
  if (stage === "blocked" || stage === "completed") {
    return { matched: false, reason: "etapa terminal" };
  }

  const expected = OS_STAGE_TEAM_CODE[stage];
  const code = normalizeTeamCode(equipe.codigo_operacional);
  if (code === expected) {
    return { matched: true, reason: `codigo_operacional=${code}` };
  }

  const nome = String(equipe.nome ?? "").trim();
  if (nome && teamNameMatchesStage(nome, stage)) {
    return { matched: true, reason: `nome≈${expected}` };
  }

  return {
    matched: false,
    reason: `codigo=${equipe.codigo_operacional ?? "null"}, nome=${nome || "—"}`,
  };
}

/** Diagnóstico do filtro por etapa (logs em server actions). */
export function debugFilterEquipesForStage<T extends EquipeStageRow>(
  equipes: T[],
  stage: OsWorkflowStage,
): { filtered: T[]; debug: EquipeStageFilterDebug } {
  const expectedCode = OS_STAGE_TEAM_CODE[stage as keyof typeof OS_STAGE_TEAM_CODE] ?? stage;
  const rows = equipes.map((e) => {
    const { matched, reason } = describeEquipeStageMatch(e, stage);
    return {
      id: e.id,
      nome: e.nome,
      codigo_operacional: e.codigo_operacional,
      ativo: e.ativo,
      matched,
      matchReason: reason,
    };
  });
  const filtered = filterEquipesForStage(equipes, stage);
  return {
    filtered,
    debug: {
      stage,
      expectedCode,
      inputTotal: equipes.length,
      matchedTotal: filtered.length,
      rows,
    },
  };
}

/** Equipe ativa com codigo_operacional compatível com a etapa. */
export function equipeMatchesStage(
  equipe: EquipeStageRow | null | undefined,
  stage: OsWorkflowStage,
): boolean {
  return describeEquipeStageMatch(equipe ?? {}, stage).matched;
}

/** Lista somente equipes válidas para a etapa operacional atual. */
export function filterEquipesForStage<T extends EquipeStageRow>(
  equipes: T[],
  stage: OsWorkflowStage,
): T[] {
  if (stage === "blocked" || stage === "completed") return [];
  return equipes.filter((e) => equipeMatchesStage(e, stage));
}

/** Equipe comercial padrão para novo cliente / OS na etapa commercial. */
export function pickDefaultCommercialEquipeId<T extends EquipeStageRow>(
  equipes: T[],
  preferredId?: string | null,
): string | null {
  const commercial = filterEquipesForStage(equipes, "commercial");
  if (!commercial.length) return null;
  if (preferredId && commercial.some((e) => e.id === preferredId)) {
    return preferredId;
  }
  return commercial[0]?.id ?? null;
}

export async function validateEquipeIdForStage(
  supabase: SupabaseClient,
  equipeId: string,
  stage: OsWorkflowStage,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from("equipes")
    .select("id, codigo_operacional, ativo, nome")
    .eq("id", equipeId)
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Equipe não encontrada" };
  }

  if (!equipeMatchesStage(data, stage)) {
    return {
      ok: false,
      message: "Equipe inválida para a etapa operacional atual",
    };
  }

  return { ok: true };
}
