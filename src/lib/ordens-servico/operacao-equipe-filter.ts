import type { SupabaseClient } from "@supabase/supabase-js";

import { canFilterCalendarByEquipe } from "@/lib/calendar/calendar-equipe-filter";
import { isUsuarioComercial, type UsuarioEquipeContext } from "@/lib/auth/usuario-campo";
import {
  filterEquipesForStage,
} from "@/lib/ordens-servico/workflow-equipe";
import type { Equipe, Usuario } from "@/lib/types/database";

type EquipeRow = Pick<Equipe, "id" | "nome" | "codigo_operacional" | "ativo" | "unidade_id">;

/** Filtro Supabase: OS vinculada a qualquer equipe da lista. */
export function ordemServicoMultiEquipeFilterOr(equipeIds: string[]): string | null {
  const ids = [...new Set(equipeIds.filter(Boolean))];
  if (!ids.length) return null;
  return ids
    .flatMap((id) => [`equipe_id.eq.${id}`, `equipe_atual_id.eq.${id}`])
    .join(",");
}

export function commercialEquipesInUnidade(
  equipes: EquipeRow[],
  unidadeId: string | null | undefined,
): EquipeRow[] {
  const commercial = filterEquipesForStage(equipes, "commercial");
  if (!unidadeId) return commercial;
  return commercial.filter((e) => !e.unidade_id || e.unidade_id === unidadeId);
}

/**
 * Equipes visíveis em /operacao para o usuário.
 * Comercial: todas as equipes commercial/SALES da mesma unidade.
 * Demais perfis: apenas a própria equipe.
 */
export async function resolveOperacaoEquipeIds(
  supabase: SupabaseClient,
  usuario: Usuario,
  viewerEquipe: UsuarioEquipeContext | null,
): Promise<string[]> {
  if (canFilterCalendarByEquipe(usuario)) return [];

  const ownId = usuario.equipe_id;
  if (!ownId) return [];

  if (!isUsuarioComercial(usuario, viewerEquipe)) {
    return [ownId];
  }

  const { data, error } = await supabase
    .from("equipes")
    .select("id, nome, codigo_operacional, ativo, unidade_id")
    .eq("ativo", true);

  if (error || !data?.length) return [ownId];

  const scoped = commercialEquipesInUnidade(data as EquipeRow[], usuario.unidade_id);
  const ids = scoped.map((e) => e.id);
  return ids.length ? ids : [ownId];
}
