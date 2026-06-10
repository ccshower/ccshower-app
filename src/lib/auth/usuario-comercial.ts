export type { ComercialNavTab, CampoNavTab, CampoProfileId } from "@/lib/auth/campo-nav";
export { CAMPO_PROFILES, COMERCIAL_NAV } from "@/lib/auth/campo-nav";

export type { UsuarioEquipeContext } from "@/lib/auth/usuario-campo";
export {
  isUsuarioComercial,
  isUsuarioInstalacao,
  isUsuarioProjeto,
  isUsuarioFinanceiro,
  resolveCampoProfile,
  resolveCampoNavTabForOs,
  resolveHomePath,
} from "@/lib/auth/usuario-campo";
