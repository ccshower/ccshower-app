import type { TipoUsuario } from "@/lib/types/database";

export const TIPOS_USUARIO: TipoUsuario[] = ["comum", "manager", "admin"];

export function isValidTipoUsuario(value: string): value is TipoUsuario {
  return TIPOS_USUARIO.includes(value as TipoUsuario);
}

export function isManager(usuario: { tipo_usuario: string; ativo?: boolean } | null | undefined): boolean {
  return !!usuario?.ativo && usuario.tipo_usuario === "manager";
}

export function isAdminOrManager(
  usuario: { tipo_usuario: string; ativo?: boolean } | null | undefined,
): boolean {
  return (
    !!usuario?.ativo &&
    (usuario.tipo_usuario === "admin" || usuario.tipo_usuario === "manager")
  );
}

/** Permissões padrão ao salvar usuário manager. */
export function permissoesParaTipoUsuario(
  tipo: TipoUsuario,
  raw: {
    pode_editar_agenda: boolean;
    pode_ver_todas_equipes: boolean;
    pode_gerenciar_estoque: boolean;
    pode_resolver_crash: boolean;
  },
) {
  if (tipo !== "manager") return raw;
  return {
    ...raw,
    pode_ver_todas_equipes: true,
  };
}
