import { redirect } from "next/navigation";

import { canViewFinancialValues } from "@/lib/auth/financial-visibility";
import { getUsuarioWithEquipe } from "@/lib/auth/get-usuario-with-equipe";
import { resolveHomePath } from "@/lib/auth/usuario-campo";

/** Workspace financeiro operacional — admin ou equipe financeira. */
export async function requireFinanceiroOperacionalPage() {
  const { usuario, equipe } = await getUsuarioWithEquipe();
  if (!usuario?.ativo) redirect("/login");

  if (canViewFinancialValues(usuario, equipe)) {
    return { usuario, equipe };
  }

  redirect(resolveHomePath(usuario, equipe));
}
