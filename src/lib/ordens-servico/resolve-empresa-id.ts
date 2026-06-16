import type { SupabaseClient } from "@supabase/supabase-js";

type EmpresaRow = {
  empresa_id?: string | null;
  unidade_id?: string | null;
};

/**
 * Resolve empresa_id para multi-tenant.
 * Ordem: cliente/usuário → unidade_id → unidade matriz.
 * (empresa_id legado; unidade_id é o tenant operacional atual.)
 */
export async function resolveEmpresaId(
  supabase: SupabaseClient,
  opts: { clienteId?: string; userId?: string },
): Promise<string | null> {
  if (opts.clienteId) {
    const { data: cli } = await supabase
      .from("clientes")
      .select("empresa_id, unidade_id")
      .eq("id", opts.clienteId)
      .maybeSingle();

    const row = cli as EmpresaRow | null;
    if (row?.empresa_id) return row.empresa_id;
    if (row?.unidade_id) return row.unidade_id;
  }

  if (opts.userId) {
    const { data: user } = await supabase
      .from("usuarios")
      .select("empresa_id, unidade_id")
      .eq("id", opts.userId)
      .maybeSingle();

    const row = user as EmpresaRow | null;
    if (row?.empresa_id) return row.empresa_id;
    if (row?.unidade_id) return row.unidade_id;
  }

  const { data: matriz } = await supabase
    .from("unidades")
    .select("id")
    .eq("matriz", true)
    .limit(1)
    .maybeSingle();

  return (matriz?.id as string | undefined) ?? null;
}
