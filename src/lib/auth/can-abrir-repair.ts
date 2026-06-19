import { isAdmin } from "@/lib/auth/is-admin";
import { isUsuarioComercial, type UsuarioEquipeContext } from "@/lib/auth/usuario-campo";
import type { Usuario } from "@/lib/types/database";

/** Admin ou equipe comercial podem abrir fluxo REPAIR. */
export function canAbrirRepair(
  usuario: Usuario | null | undefined,
  equipe: UsuarioEquipeContext | null | undefined,
): boolean {
  if (!usuario?.ativo) return false;
  if (isAdmin(usuario)) return true;
  return isUsuarioComercial(usuario, equipe);
}
