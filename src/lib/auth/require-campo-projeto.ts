import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/auth/is-admin";
import { getUsuarioWithEquipe } from "@/lib/auth/get-usuario-with-equipe";
import {
  isUsuarioProjeto,
  resolveHomePath,
} from "@/lib/auth/usuario-campo";

/** Páginas exclusivas da equipe Projeto (admin também pode acessar). */
export async function requireCampoProjetoPage() {
  const { usuario, equipe } = await getUsuarioWithEquipe();
  if (!usuario?.ativo) redirect("/login");

  if (isAdmin(usuario) || isUsuarioProjeto(usuario, equipe)) {
    return { usuario, equipe };
  }

  redirect(resolveHomePath(usuario, equipe));
}
