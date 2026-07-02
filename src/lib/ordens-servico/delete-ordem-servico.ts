import type { SupabaseClient } from "@supabase/supabase-js";

const OS_ANEXOS_BUCKET = "os-anexos";

export type DeleteOrdemServicoResult =
  | { ok: true }
  | { ok: false; message: string };

/** Remove OS e dependências (service role — validar admin antes de chamar). */
export async function deleteOrdemServicoById(
  supabase: SupabaseClient,
  osId: string,
): Promise<DeleteOrdemServicoResult> {
  const trimmedId = osId.trim();
  if (!trimmedId) {
    return { ok: false, message: "Invalid work order id" };
  }

  const { data: os, error: osErr } = await supabase
    .from("ordens_servico")
    .select("id")
    .eq("id", trimmedId)
    .maybeSingle();

  if (osErr) return { ok: false, message: osErr.message };
  if (!os) return { ok: false, message: "Work order not found" };

  const { data: anexos, error: anexosErr } = await supabase
    .from("os_anexos")
    .select("storage_path")
    .eq("ordem_servico_id", trimmedId);

  if (anexosErr) return { ok: false, message: anexosErr.message };

  const storagePaths = (anexos ?? [])
    .map((a) => a.storage_path)
    .filter((p): p is string => Boolean(p?.trim()));

  await supabase
    .from("ordens_servico")
    .update({ repair_episode_id: null, repair_ativo: false })
    .eq("id", trimmedId);

  const childDeletes = [
    supabase.from("os_ficha_tecnica_items").delete().eq("ordem_servico_id", trimmedId),
    supabase.from("os_separation_list_items").delete().eq("ordem_servico_id", trimmedId),
    supabase.from("os_anexos").delete().eq("ordem_servico_id", trimmedId),
    supabase.from("os_repair_episodes").delete().eq("ordem_servico_id", trimmedId),
    supabase.from("os_ambientes").delete().eq("ordem_servico_id", trimmedId),
    supabase.from("os_crashes").delete().eq("ordem_servico_id", trimmedId),
    supabase.from("agenda_eventos").delete().eq("ordem_servico_id", trimmedId),
  ] as const;

  for (const op of childDeletes) {
    const { error } = await op;
    if (error) return { ok: false, message: error.message };
  }

  const { error: delErr } = await supabase
    .from("ordens_servico")
    .delete()
    .eq("id", trimmedId);

  if (delErr) return { ok: false, message: delErr.message };

  if (storagePaths.length > 0) {
    const { error: storageErr } = await supabase.storage
      .from(OS_ANEXOS_BUCKET)
      .remove(storagePaths);
    if (storageErr) {
      return {
        ok: false,
        message: `Work order removed, but some files remain in storage: ${storageErr.message}`,
      };
    }
  }

  return { ok: true };
}
