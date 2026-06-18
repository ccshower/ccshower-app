import { isAdminOrManager } from "@/lib/auth/tipo-usuario";
import type { Unidade, Usuario } from "@/lib/types/database";

export const CENTRO_UNIDADE_PARAM = "unidade";
export const CENTRO_UNIDADE_COOKIE = "cc_centro_unidade";

export function centroOperacionalPath(unidadeId?: string | null): string {
  if (!unidadeId) return "/admin/centro-operacional";
  return `/admin/centro-operacional?${CENTRO_UNIDADE_PARAM}=${encodeURIComponent(unidadeId)}`;
}

export function osWorkspacePathWithUnidade(
  osId: string,
  unidadeId?: string | null,
): string {
  if (!unidadeId) return `/os/${osId}`;
  return `/os/${osId}?${CENTRO_UNIDADE_PARAM}=${encodeURIComponent(unidadeId)}`;
}

/** Admin: URL param → cookie → todas. Campo: unidade do usuário. */
export function resolveCentroUnidadeId(
  usuario: Usuario | null,
  unidades: Unidade[],
  param: string | undefined,
  cookieValue: string | undefined,
): string | null {
  if (!isAdminOrManager(usuario)) {
    return usuario?.unidade_id ?? null;
  }

  const candidate = param?.trim() || cookieValue?.trim() || "";
  if (candidate && unidades.some((u) => u.id === candidate)) {
    return candidate;
  }
  return null;
}
