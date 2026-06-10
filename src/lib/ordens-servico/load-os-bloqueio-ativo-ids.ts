import type { SupabaseClient } from "@supabase/supabase-js";

import { BLOQUEIO_STATUS_ATIVO } from "@/lib/ordens-servico/bloqueio-operacional";

/** IDs de OS com registro ativo em `os_crashes`. */
export async function loadOsIdsComBloqueioAtivo(
  supabase: SupabaseClient,
  osIds: string[],
): Promise<Set<string>> {
  if (osIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from("os_crashes")
    .select("ordem_servico_id")
    .in("ordem_servico_id", osIds)
    .eq("status", BLOQUEIO_STATUS_ATIVO);

  if (error) {
    console.error("[loadOsIdsComBloqueioAtivo]", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((r) => r.ordem_servico_id as string));
}
