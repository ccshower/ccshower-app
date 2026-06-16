import {
  agendaEventoStartIso,
  AGENDA_EVENTO_DATETIME_COLUMNS,
} from "@/lib/ordens-servico/agenda-evento-query";
import { mesOperacionalBoundsIso } from "@/lib/centro-operacional/mes-operacional-bounds";
import { createClient } from "@/lib/supabase/server";

import {
  PRODUCAO_MENSAL_META,
  PRODUCAO_MENSAL_VAZIO,
  type ProducaoMensalData,
} from "./producao-mensal";

const INSTALACAO_CONCLUIDA_STATUS = new Set(["completed", "concluido"]);

type OsConcluidaRow = {
  valor_final: number | string | null;
};

type AgendaInstalacaoRow = {
  ordem_servico_id: string;
  tipo_evento: string;
  status?: string | null;
  data_evento?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  hora_evento?: string | null;
};

function eventoNoMes(startIso: string, monthStartMs: number, monthEndMs: number): boolean {
  const t = new Date(startIso).getTime();
  return t >= monthStartMs && t < monthEndMs;
}

function isInstalacaoConcluida(row: AgendaInstalacaoRow): boolean {
  if (row.tipo_evento === "installation_completed") return true;
  if (row.tipo_evento !== "installation") return false;
  return INSTALACAO_CONCLUIDA_STATUS.has(row.status ?? "");
}

function somaValorFinal(rows: OsConcluidaRow[]): number {
  return rows.reduce((acc, row) => {
    const raw = row.valor_final;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n) || n <= 0) return acc;
    return acc + n;
  }, 0);
}

export async function loadProducaoMensal(
  unidadeId?: string | null,
): Promise<ProducaoMensalData> {
  const bounds = mesOperacionalBoundsIso();
  if (!bounds) {
    return {
      ...PRODUCAO_MENSAL_VAZIO,
      error: "Período operacional inválido",
    };
  }

  const monthStartMs = new Date(bounds.start).getTime();
  const monthEndMs = new Date(bounds.end).getTime();

  const supabase = await createClient();

  let metaMensal = PRODUCAO_MENSAL_META;
  if (unidadeId) {
    const { data: unidadeRow } = await supabase
      .from("unidades")
      .select("meta_producao_mensal")
      .eq("id", unidadeId)
      .maybeSingle();
    const raw = unidadeRow?.meta_producao_mensal;
    const parsed = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      metaMensal = parsed;
    }
  }

  let osQuery = supabase
    .from("ordens_servico")
    .select("valor_final")
    .eq("ativo", true)
    .eq("status", "completed")
    .eq("etapa_atual", "completed")
    .gte("atualizado_em", bounds.start)
    .lt("atualizado_em", bounds.end);
  if (unidadeId) osQuery = osQuery.eq("unidade_id", unidadeId);

  let agendaQuery = supabase
    .from("agenda_eventos")
    .select(`${AGENDA_EVENTO_DATETIME_COLUMNS}, ordem_servico_id`)
    .in("tipo_evento", ["installation", "installation_completed"])
    .in("status", ["completed", "concluido"])
    .or(
      `and(data_inicio.gte.${bounds.start},data_inicio.lt.${bounds.end}),and(data_evento.gte.${bounds.start},data_evento.lt.${bounds.end})`,
    );
  if (unidadeId) agendaQuery = agendaQuery.eq("unidade_id", unidadeId);

  const [osRes, agendaRes] = await Promise.all([osQuery, agendaQuery]);

  const error = osRes.error?.message ?? agendaRes.error?.message ?? null;
  if (error) {
    return { ...PRODUCAO_MENSAL_VAZIO, error };
  }

  const valorRealizado = somaValorFinal((osRes.data ?? []) as OsConcluidaRow[]);

  const instalacoesConcluidas = new Set<string>();
  for (const row of (agendaRes.data ?? []) as AgendaInstalacaoRow[]) {
    if (!isInstalacaoConcluida(row)) continue;
    if (!row.ordem_servico_id) continue;

    const startIso = agendaEventoStartIso(row);
    if (!startIso) continue;
    if (!eventoNoMes(startIso, monthStartMs, monthEndMs)) continue;

    instalacoesConcluidas.add(row.ordem_servico_id);
  }

  return {
    metaMensal,
    valorRealizado,
    instalacoesConcluidas: instalacoesConcluidas.size,
    error: null,
  };
}
