import { createClient } from "@/lib/supabase/server";
import type { Unidade } from "@/lib/types/database";

/** Unidades ativas, matriz primeiro. */
export async function loadUnidades(): Promise<{
  unidades: Unidade[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("unidades")
    .select("id, nome, timezone, matriz, meta_producao_mensal, ativo, criado_em")
    .eq("ativo", true)
    .order("matriz", { ascending: false })
    .order("nome", { ascending: true });

  if (error) {
    return { unidades: [], error: error.message };
  }

  return { unidades: (data ?? []) as Unidade[], error: null };
}
