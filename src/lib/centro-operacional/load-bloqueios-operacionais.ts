import { BLOQUEIO_STATUS_ATIVO } from "@/lib/ordens-servico/bloqueio-operacional";
import { osWorkspacePath } from "@/lib/ordens-servico/os-routes";
import { createClient } from "@/lib/supabase/server";

import {
  formatOsRef,
  mapEtapaFluxoLabel,
} from "./atencao-agora";
import {
  buildBloqueioFilters,
  compareBloqueiosOperacionais,
  diasDesdeCrash,
  formatCrashAbertoEm,
  resolveBloqueioFilterCategoria,
  resolveBloqueioImpacto,
  BLOQUEIO_SEM_RESPONSAVEL_LABEL,
  type BloqueioOperacionalItem,
  type BloqueiosOperacionaisData,
} from "./bloqueios-operacionais";

type CrashRow = {
  id: string;
  ordem_servico_id: string;
  etapa: string;
  categoria: string;
  motivo: string;
  criado_em: string;
  ordens_servico: {
    id: string;
    ativo: boolean;
    responsavel_id: string | null;
    clientes: { nome: string | null } | null;
    responsavel: { nome: string | null } | null;
  } | null;
};

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeCrashRow(row: {
  id: string;
  ordem_servico_id: string;
  etapa: string;
  categoria: string;
  motivo: string;
  criado_em: string;
  ordens_servico:
    | {
        id: string;
        ativo: boolean;
        responsavel_id: string | null;
        clientes: { nome: string | null } | { nome: string | null }[] | null;
        responsavel: { nome: string | null } | { nome: string | null }[] | null;
      }
    | {
        id: string;
        ativo: boolean;
        responsavel_id: string | null;
        clientes: { nome: string | null } | { nome: string | null }[] | null;
        responsavel: { nome: string | null } | { nome: string | null }[] | null;
      }[]
    | null;
}): CrashRow {
  const os = relationOne(row.ordens_servico);
  return {
    ...row,
    ordens_servico: os
      ? {
          ...os,
          clientes: relationOne(os.clientes),
          responsavel: relationOne(os.responsavel),
        }
      : null,
  };
}

export async function loadBloqueiosOperacionais(
  unidadeId?: string | null,
): Promise<BloqueiosOperacionaisData> {
  const supabase = await createClient();
  const nowMs = Date.now();

  let query = supabase
    .from("os_crashes")
    .select(
      `
      id,
      ordem_servico_id,
      etapa,
      categoria,
      motivo,
      criado_em,
      ordens_servico!inner (
        id,
        ativo,
        responsavel_id,
        clientes!cliente_id ( nome ),
        responsavel:usuarios!responsavel_id ( nome )
      )
    `,
    )
    .eq("status", BLOQUEIO_STATUS_ATIVO);
  if (unidadeId) query = query.eq("ordens_servico.unidade_id", unidadeId);

  const { data, error } = await query.order("criado_em", { ascending: true });

  if (error) {
    return {
      items: [],
      totalCount: 0,
      filters: buildBloqueioFilters([]),
      error: error.message,
    };
  }

  const items: BloqueioOperacionalItem[] = [];

  for (const row of (data ?? []).map(normalizeCrashRow)) {
    const os = row.ordens_servico;
    if (!os?.ativo) continue;

    const dias = diasDesdeCrash(row.criado_em, nowMs);
    const cliente = os.clientes?.nome?.trim() || "Client";
    const semResponsavel = !os.responsavel_id;
    const resp = semResponsavel
      ? BLOQUEIO_SEM_RESPONSAVEL_LABEL
      : os.responsavel?.nome?.trim() || "—";

    items.push({
      id: row.id,
      osId: row.ordem_servico_id,
      href: osWorkspacePath(row.ordem_servico_id),
      cliente,
      os: formatOsRef(row.ordem_servico_id),
      etapa: mapEtapaFluxoLabel(row.etapa),
      categoria: row.categoria,
      filterCategoria: resolveBloqueioFilterCategoria(row.categoria, row.etapa),
      motivo: row.motivo,
      aberto: formatCrashAbertoEm(row.criado_em, nowMs),
      dias,
      resp,
      semResponsavel,
      criadoEm: row.criado_em,
      impactoOperacional: resolveBloqueioImpacto(row.etapa),
    });
  }

  items.sort(compareBloqueiosOperacionais);

  return {
    items,
    totalCount: items.length,
    filters: buildBloqueioFilters(items),
    error: null,
  };
}
