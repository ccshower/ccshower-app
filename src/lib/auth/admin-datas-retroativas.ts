import type { Usuario } from "@/lib/types/database";

/** Admin pode lançar visitas, instalações e datas de material no passado. */
export function usuarioPodeLancarDatasRetroativas(
  usuario: Pick<Usuario, "tipo_usuario" | "ativo"> | null | undefined,
): boolean {
  return !!usuario?.ativo && usuario.tipo_usuario === "admin";
}
