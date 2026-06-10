import { BLOQUEIO_STATUS_ATIVO } from "@/lib/ordens-servico/bloqueio-operacional";
import { parseFinancialDecision } from "@/lib/ordens-servico/financial-workspace";
import { isOsNaFilaProjeto } from "@/lib/ordens-servico/fila-projeto-query";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import { createClient } from "@/lib/supabase/server";

import { resolveBloqueioFilterCategoria } from "./bloqueios-operacionais";
import {
  GARGALO_LIMIARES,
  GARGALOS_OPERACIONAIS_VAZIO,
  type GargaloOperacionalItem,
  type GargalosOperacionaisData,
} from "./gargalos-operacionais";
import { SAUDE_FINANCEIROS_PENDENTES } from "./saude-operacional";

const OS_OPEN = new Set(["open", "scheduled", "in_progress"]);

type OsRow = {
  id: string;
  status: string;
  etapa_atual: string | null;
  status_atual: string | null;
  financial_decision: string | null;
  atualizado_em: string;
};

type CrashRow = {
  id: string;
  categoria: string;
  etapa: string;
  ordens_servico: { id: string; ativo: boolean; status: string } | null;
};

function diasDesde(iso: string, nowMs: number): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((nowMs - t) / 86_400_000));
}

function buildItems(osRows: OsRow[], crashRows: CrashRow[], nowMs: number): GargaloOperacionalItem[] {
  const abertas = osRows.filter((os) => OS_OPEN.has(os.status));

  const filaComercial = abertas.filter(
    (os) =>
      parseOsStage(os.etapa_atual) === "commercial" &&
      os.status_atual === "no_visit",
  ).length;

  const diasGargalo = SAUDE_FINANCEIROS_PENDENTES.diasGargalo;
  const financeiroPendentes = abertas.filter(
    (os) =>
      parseOsStage(os.etapa_atual) === "financial_review" &&
      parseFinancialDecision(os.financial_decision) === "pending" &&
      diasDesde(os.atualizado_em, nowMs) >= diasGargalo,
  ).length;

  const projetoPendentes = abertas.filter((os) => isOsNaFilaProjeto(os)).length;

  const materialOsIds = new Set<string>();
  for (const crash of crashRows) {
    const os = crash.ordens_servico;
    if (!os?.ativo || !OS_OPEN.has(os.status)) continue;
    if (resolveBloqueioFilterCategoria(crash.categoria, crash.etapa) !== "Material") {
      continue;
    }
    materialOsIds.add(os.id);
  }
  const materialCrashes = materialOsIds.size;

  const items: GargaloOperacionalItem[] = [];

  if (filaComercial >= GARGALO_LIMIARES.comercialFilaMin) {
    items.push({
      id: "comercial",
      etapa: "Comercial",
      descricao: `Fila com ${filaComercial} OS aguardando primeira visita`,
      impacto: `${filaComercial} OS sem agendamento`,
    });
  }

  if (financeiroPendentes >= GARGALO_LIMIARES.financeiroPendentesMin) {
    items.push({
      id: "financeiro",
      etapa: "Financeiro",
      descricao: `${financeiroPendentes} aprovações pendentes há +${diasGargalo} dias`,
      impacto: `${financeiroPendentes} OS aguardando`,
    });
  }

  if (projetoPendentes >= GARGALO_LIMIARES.projetoPendentesMin) {
    items.push({
      id: "projeto",
      etapa: "Projeto",
      descricao: `Fila de aprovação com ${projetoPendentes} OS paradas`,
      impacto: `${projetoPendentes} OS afetadas`,
    });
  }

  if (materialCrashes >= GARGALO_LIMIARES.materialCrashesMin) {
    items.push({
      id: "material",
      etapa: "Material",
      descricao: `${materialCrashes} OS travadas por material`,
      impacto: "Bloqueios ativos de material/fornecedor",
    });
  }

  return items;
}

export async function loadGargalosOperacionais(
  unidadeId?: string | null,
): Promise<GargalosOperacionaisData> {
  const nowMs = Date.now();
  const supabase = await createClient();

  let osQuery = supabase
    .from("ordens_servico")
    .select("id, status, etapa_atual, status_atual, financial_decision, atualizado_em")
    .eq("ativo", true);
  if (unidadeId) osQuery = osQuery.eq("unidade_id", unidadeId);

  let crashQuery = supabase
    .from("os_crashes")
    .select(
      `
      id,
      categoria,
      etapa,
      ordens_servico!inner ( id, ativo, status )
    `,
    )
    .eq("status", BLOQUEIO_STATUS_ATIVO);
  if (unidadeId) crashQuery = crashQuery.eq("ordens_servico.unidade_id", unidadeId);

  const [osRes, crashRes] = await Promise.all([osQuery, crashQuery]);

  const error = osRes.error?.message ?? crashRes.error?.message ?? null;
  if (error) {
    return { ...GARGALOS_OPERACIONAIS_VAZIO, error };
  }

  return {
    items: buildItems(
      (osRes.data ?? []) as OsRow[],
      (crashRes.data ?? []) as unknown as CrashRow[],
      nowMs,
    ),
    error: null,
  };
}
