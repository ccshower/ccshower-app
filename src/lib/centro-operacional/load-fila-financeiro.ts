import { parseFinancialDecision } from "@/lib/ordens-servico/financial-workspace";
import { createClient } from "@/lib/supabase/server";
import type { Cliente, Equipe } from "@/lib/types/database";

import type { FilaFinanceiroItem } from "./fila-financeiro";

export async function loadFilaFinanceiro(unidadeId?: string | null): Promise<{
  fila: FilaFinanceiroItem[];
  error: string | null;
}> {
  const supabase = await createClient();

  let osQuery = supabase
    .from("ordens_servico")
    .select(
      "id, cliente_id, atualizado_em, equipe_id, equipe_atual_id, status_atual, financial_decision, valor_final",
    )
    .eq("ativo", true)
    .eq("etapa_atual", "financial_review")
    .in("status", ["open", "scheduled", "in_progress"]);

  if (unidadeId) osQuery = osQuery.eq("unidade_id", unidadeId);

  const { data: osRows, error: osError } = await osQuery.order("atualizado_em", {
    ascending: true,
  });

  if (osError) {
    return { fila: [], error: osError.message };
  }

  if (!osRows?.length) {
    return { fila: [], error: null };
  }

  const clienteIds = [...new Set(osRows.map((o) => o.cliente_id as string))];
  const equipeIds = [
    ...new Set(
      osRows
        .map((o) => (o.equipe_atual_id ?? o.equipe_id) as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [{ data: clientes, error: clientesError }, { data: equipesRows, error: equipesError }] =
    await Promise.all([
      supabase.from("clientes").select("id, nome").in("id", clienteIds).eq("ativo", true),
      equipeIds.length
        ? supabase
            .from("equipes")
            .select("id, nome, cor_primaria, cor_secundaria")
            .in("id", equipeIds)
        : Promise.resolve({
            data: [] as Pick<Equipe, "id" | "nome" | "cor_primaria" | "cor_secundaria">[],
            error: null,
          }),
    ]);

  const error = clientesError?.message ?? equipesError?.message ?? null;
  if (error) {
    return { fila: [], error };
  }

  const clienteMap = new Map(((clientes ?? []) as Cliente[]).map((c) => [c.id, c]));
  const eqMap = new Map<string, Pick<Equipe, "id" | "nome" | "cor_primaria" | "cor_secundaria">>();
  for (const equipe of equipesRows ?? []) {
    eqMap.set(equipe.id, equipe);
  }

  const fila: FilaFinanceiroItem[] = [];

  for (const os of osRows) {
    const cliente = clienteMap.get(os.cliente_id as string);
    if (!cliente) continue;

    const equipeId = (os.equipe_atual_id ?? os.equipe_id) as string | null;
    const equipe = equipeId ? eqMap.get(equipeId) : undefined;
    const valorRaw = os.valor_final as number | string | null | undefined;
    const valorFinal =
      valorRaw == null || valorRaw === ""
        ? null
        : Number.isFinite(Number(valorRaw))
          ? Number(valorRaw)
          : null;

    fila.push({
      osId: os.id as string,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      equipeId,
      equipeNome: equipe?.nome ?? null,
      equipeCorPrimaria: equipe?.cor_primaria ?? null,
      statusAtual: (os.status_atual as string) ?? "financial_pending",
      financialDecision: parseFinancialDecision(os.financial_decision as string | null),
      valorFinal,
      atualizadoEm: os.atualizado_em as string,
    });
  }

  return { fila, error: null };
}
