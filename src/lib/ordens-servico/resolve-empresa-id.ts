import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolve empresa_id para multi-tenant (cliente → usuário). */
export async function resolveEmpresaId(
  supabase: SupabaseClient,
  opts: { clienteId?: string; userId?: string },
): Promise<string | null> {
  if (opts.clienteId) {
    const { data: cli } = await supabase
      .from("clientes")
      .select("empresa_id")
      .eq("id", opts.clienteId)
      .maybeSingle();
    if (cli?.empresa_id) return cli.empresa_id as string;
  }

  if (opts.userId) {
    const { data: user } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("id", opts.userId)
      .maybeSingle();
    if (user?.empresa_id) return user.empresa_id as string;
  }

  return null;
}
