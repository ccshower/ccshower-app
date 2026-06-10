import type { Usuario } from "@/lib/types/database";

export function isAdmin(usuario: Usuario | null | undefined): boolean {
  return !!usuario && usuario.tipo_usuario === "admin" && usuario.ativo;
}
