import type { SupabaseClient } from "@supabase/supabase-js";

export function resolveOsEquipeId(os: {
  equipe_atual_id?: string | null;
  equipe_id?: string | null;
}): string | null {
  const id = os.equipe_atual_id ?? os.equipe_id ?? null;
  return id && String(id).trim() ? String(id).trim() : null;
}

export function clienteSemEquipe(cliente: { equipe_id?: string | null }): boolean {
  return !cliente.equipe_id;
}

export function osSemEquipe(os: {
  equipe_atual_id?: string | null;
  equipe_id?: string | null;
}): boolean {
  return !resolveOsEquipeId(os);
}

export async function validateEquipeOperacional(
  supabase: SupabaseClient,
  equipeId: string | null | undefined,
): Promise<{ ok: true; equipe_id: string } | { ok: false; message: string }> {
  const id = String(equipeId ?? "").trim();
  if (!id) {
    return { ok: false, message: "Equipe operacional é obrigatória" };
  }

  const { data, error } = await supabase
    .from("equipes")
    .select("id, ativo")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Equipe operacional inválida" };
  }
  if (!data.ativo) {
    return { ok: false, message: "Equipe operacional está inativa" };
  }

  return { ok: true, equipe_id: id };
}
