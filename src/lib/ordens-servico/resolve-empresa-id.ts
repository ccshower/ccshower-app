import type { SupabaseClient } from "@supabase/supabase-js";

type EmpresaRow = {
  empresa_id?: string | null;
};

async function loadEmpresaId(
  supabase: SupabaseClient,
  table: "clientes" | "usuarios",
  id: string,
): Promise<string | null> {
  const { data } = await supabase
    .from(table)
    .select("empresa_id")
    .eq("id", id)
    .maybeSingle();

  const row = data as EmpresaRow | null;
  return row?.empresa_id ?? null;
}

async function loadDefaultEmpresaId(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from("empresas")
    .select("id")
    .eq("ativo", true)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return (data?.id as string | undefined) ?? null;
}

/**
 * Resolve empresa_id (FK → public.empresas).
 * Ordem: cliente → usuário → primeira empresa ativa.
 */
export async function resolveEmpresaId(
  supabase: SupabaseClient,
  opts: { clienteId?: string; userId?: string },
): Promise<string | null> {
  if (opts.clienteId) {
    const fromCliente = await loadEmpresaId(supabase, "clientes", opts.clienteId);
    if (fromCliente) return fromCliente;
  }

  if (opts.userId) {
    const fromUser = await loadEmpresaId(supabase, "usuarios", opts.userId);
    if (fromUser) return fromUser;
  }

  return loadDefaultEmpresaId(supabase);
}
