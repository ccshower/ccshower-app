import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadUnidadeIdFromEquipe(
  supabase: SupabaseClient,
  equipeId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("equipes")
    .select("unidade_id")
    .eq("id", equipeId)
    .maybeSingle();

  return (data?.unidade_id as string | null | undefined) ?? null;
}

/** Propaga unidade da equipe para cliente, OS ativas e eventos de agenda. */
export async function syncUnidadeOperacionalCliente(
  supabase: SupabaseClient,
  clienteId: string,
  unidadeId: string | null,
): Promise<void> {
  if (!unidadeId) return;

  await supabase.from("clientes").update({ unidade_id: unidadeId }).eq("id", clienteId);

  const { data: osRows } = await supabase
    .from("ordens_servico")
    .select("id")
    .eq("cliente_id", clienteId)
    .eq("ativo", true);

  const osIds = (osRows ?? []).map((row) => row.id as string);
  if (!osIds.length) return;

  await supabase.from("ordens_servico").update({ unidade_id: unidadeId }).in("id", osIds);

  await supabase
    .from("agenda_eventos")
    .update({ unidade_id: unidadeId })
    .in("ordem_servico_id", osIds);
}
