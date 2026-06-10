import { createClient } from "@/lib/supabase/server";
import type { Cliente, ClienteWithRelations, Equipe } from "@/lib/types/database";

import type { FilaComercialItem } from "./fila-comercial";

export async function loadFilaComercial(unidadeId?: string | null): Promise<{
  fila: FilaComercialItem[];
  detalhes: Record<string, ClienteWithRelations>;
  error: string | null;
}> {
  const supabase = await createClient();

  let osQuery = supabase
    .from("ordens_servico")
    .select("id, cliente_id, criado_em, equipe_id, equipe_atual_id")
    .eq("ativo", true)
    .eq("etapa_atual", "commercial")
    .eq("status_atual", "no_visit");
  if (unidadeId) osQuery = osQuery.eq("unidade_id", unidadeId);

  const { data: osRows, error: osError } = await osQuery.order("criado_em", {
    ascending: true,
  });

  if (osError) {
    return { fila: [], detalhes: {}, error: osError.message };
  }

  if (!osRows?.length) {
    return { fila: [], detalhes: {}, error: null };
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
      supabase.from("clientes").select("*").in("id", clienteIds).eq("ativo", true),
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
    return { fila: [], detalhes: {}, error };
  }

  const clienteMap = new Map(((clientes ?? []) as Cliente[]).map((c) => [c.id, c]));
  const eqMap = new Map<string, Pick<Equipe, "id" | "nome" | "cor_primaria" | "cor_secundaria">>();
  for (const equipe of equipesRows ?? []) {
    eqMap.set(equipe.id, equipe);
  }

  const detalhes: Record<string, ClienteWithRelations> = {};
  const fila: FilaComercialItem[] = [];

  for (const os of osRows) {
    const cliente = clienteMap.get(os.cliente_id as string);
    if (!cliente) continue;

    const equipeId = (os.equipe_atual_id ?? os.equipe_id) as string | null;
    const equipe = equipeId ? eqMap.get(equipeId) : undefined;

    if (!detalhes[cliente.id]) {
      detalhes[cliente.id] = {
        ...cliente,
        equipe: equipe
          ? {
              id: equipe.id,
              nome: equipe.nome,
              cor_primaria: equipe.cor_primaria,
              cor_secundaria: equipe.cor_secundaria,
            }
          : null,
      };
    }

    fila.push({
      osId: os.id as string,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      equipeId: equipeId,
      equipeNome: equipe?.nome ?? null,
      equipeCorPrimaria: equipe?.cor_primaria ?? null,
      criadoEm: os.criado_em as string,
    });
  }

  return { fila, detalhes, error: null };
}
