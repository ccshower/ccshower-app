import { redirect } from "next/navigation";

import { getCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { isAdmin } from "@/lib/auth/is-admin";

/** Rotas de cadastro — somente admin (não manager). */
export async function requireAdminOnlyPage() {
  const { usuario } = await getCurrentUsuario();
  if (!usuario?.ativo) redirect("/login");
  if (!isAdmin(usuario)) redirect("/admin/centro-operacional");
  return { usuario };
}
