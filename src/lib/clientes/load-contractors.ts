import type { SupabaseClient } from "@supabase/supabase-js";

import type { Contractor } from "@/lib/types/database";

export async function loadContractorsAtivos(
  supabase: SupabaseClient,
): Promise<{ contractors: Contractor[]; error?: string }> {
  const { data, error } = await supabase
    .from("contractors")
    .select("id, nome, telefone, email, ativo, criado_em, atualizado_em")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) return { contractors: [], error: error.message };
  return { contractors: (data ?? []) as Contractor[] };
}

export async function loadContractorsAdmin(
  supabase: SupabaseClient,
): Promise<{ contractors: Contractor[]; error?: string }> {
  const { data, error } = await supabase
    .from("contractors")
    .select("id, nome, telefone, email, ativo, criado_em, atualizado_em")
    .order("nome", { ascending: true });

  if (error) return { contractors: [], error: error.message };
  return { contractors: (data ?? []) as Contractor[] };
}
