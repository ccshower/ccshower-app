import { isAdmin } from "@/lib/auth/is-admin";
import { isManager } from "@/lib/auth/tipo-usuario";
import type { CampoNavTab, CampoProfileId } from "@/lib/auth/campo-nav";
import { equipeMatchesStage } from "@/lib/ordens-servico/workflow-equipe";
import { centroOperacionalPath } from "@/lib/unidades/centro-unidade-persist";
import type { Equipe, Usuario } from "@/lib/types/database";

export type { CampoNavTab, CampoProfileId } from "@/lib/auth/campo-nav";
export { CAMPO_PROFILES, COMERCIAL_NAV } from "@/lib/auth/campo-nav";
export type { ComercialNavTab } from "@/lib/auth/campo-nav";

export type UsuarioEquipeContext = Pick<
  Equipe,
  "id" | "nome" | "codigo_operacional" | "cor_primaria" | "ativo"
>;

/** Usuário de campo da equipe comercial (não-admin). */
export function isUsuarioComercial(
  usuario: Usuario | null | undefined,
  equipe: UsuarioEquipeContext | null | undefined,
): boolean {
  if (!usuario?.ativo || isAdmin(usuario) || isManager(usuario)) return false;
  if (!equipe?.ativo) return false;
  return equipeMatchesStage(equipe, "commercial");
}

/** Usuário de campo da equipe de instalação (não-admin). */
export function isUsuarioInstalacao(
  usuario: Usuario | null | undefined,
  equipe: UsuarioEquipeContext | null | undefined,
): boolean {
  if (!usuario?.ativo || isAdmin(usuario) || isManager(usuario)) return false;
  if (!equipe?.ativo) return false;
  return equipeMatchesStage(equipe, "installation");
}

/** Usuário de campo da equipe de projeto (não-admin). */
export function isUsuarioProjeto(
  usuario: Usuario | null | undefined,
  equipe: UsuarioEquipeContext | null | undefined,
): boolean {
  if (!usuario?.ativo || isAdmin(usuario) || isManager(usuario)) return false;
  if (!equipe?.ativo) return false;
  return equipeMatchesStage(equipe, "project");
}

/** Usuário de campo da equipe financeira (não-admin). */
export function isUsuarioFinanceiro(
  usuario: Usuario | null | undefined,
  equipe: UsuarioEquipeContext | null | undefined,
): boolean {
  if (!usuario?.ativo || isAdmin(usuario) || isManager(usuario)) return false;
  if (!equipe?.ativo) return false;
  return equipeMatchesStage(equipe, "financial_review");
}

/** Perfil de campo, ou null para outros usuários. */
export function resolveCampoProfile(
  usuario: Usuario | null | undefined,
  equipe: UsuarioEquipeContext | null | undefined,
): CampoProfileId | null {
  if (isUsuarioComercial(usuario, equipe)) return "commercial";
  if (isUsuarioInstalacao(usuario, equipe)) return "installation";
  if (isUsuarioProjeto(usuario, equipe)) return "project";
  if (isUsuarioFinanceiro(usuario, equipe)) return "financial";
  return null;
}

/** Aba do shell ao abrir workspace /os/[id]. */
export function resolveCampoNavTabForOs(profile: CampoProfileId): CampoNavTab {
  if (profile === "commercial" || profile === "project" || profile === "financial") {
    return "operacao";
  }
  return "agenda";
}

/** Destino pós-login conforme perfil. */
export function resolveHomePath(
  usuario: Usuario,
  equipe: UsuarioEquipeContext | null | undefined,
): string {
  if (isAdmin(usuario) || isManager(usuario)) return "/admin/centro-operacional";
  if (isUsuarioComercial(usuario, equipe)) return "/calendar";
  if (isUsuarioInstalacao(usuario, equipe)) return "/calendar";
  if (isUsuarioProjeto(usuario, equipe)) return "/operacao";
  if (isUsuarioFinanceiro(usuario, equipe)) return "/financeiro";
  return "/operacao";
}

/** Voltar do workspace /os/[id] para o painel operacional do usuário. */
export function resolveOsWorkspaceBackPath(
  usuario: Usuario,
  equipe: UsuarioEquipeContext | null | undefined,
  unidadeId?: string | null,
): string {
  const home = resolveHomePath(usuario, equipe);
  if (home === "/admin/centro-operacional" && unidadeId) {
    return centroOperacionalPath(unidadeId);
  }
  return home;
}
