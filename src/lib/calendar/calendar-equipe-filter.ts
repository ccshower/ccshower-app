import type { Equipe, Usuario } from "@/lib/types/database";

export type CalendarEquipeOption = Pick<Equipe, "id" | "nome" | "cor_primaria">;

export function canFilterCalendarByEquipe(usuario: Usuario): boolean {
  return usuario.tipo_usuario === "admin" || usuario.pode_ver_todas_equipes;
}

/** Equipe efetiva do filtro — usuários com escopo limitado ficam na própria equipe. */
export function resolveCalendarEquipeFilter(
  usuario: Usuario,
  equipeParam: string | undefined,
): string | null {
  if (canFilterCalendarByEquipe(usuario)) {
    const id = equipeParam?.trim();
    return id || null;
  }
  return usuario.equipe_id ?? null;
}

/** Filtro Supabase: OS vinculada à equipe por `equipe_id` ou `equipe_atual_id`. */
export function ordemServicoEquipeFilterOr(equipeId: string): string {
  return `equipe_id.eq.${equipeId},equipe_atual_id.eq.${equipeId}`;
}

export function operacaoHref(params: { equipe?: string | null }): string {
  const sp = new URLSearchParams();
  if (params.equipe) sp.set("equipe", params.equipe);
  const q = sp.toString();
  return q ? `/operacao?${q}` : "/operacao";
}
