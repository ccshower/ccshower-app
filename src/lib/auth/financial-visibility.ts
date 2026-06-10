import { isAdmin } from "@/lib/auth/get-current-usuario";
import { equipeMatchesStage } from "@/lib/ordens-servico/workflow-equipe";
import type { Equipe, Usuario } from "@/lib/types/database";

export type ViewerEquipe = Pick<
  Equipe,
  "id" | "nome" | "codigo_operacional" | "cor_primaria" | "ativo"
>;

/** Valores financeiros — somente admin ou equipe financeira. */
export function canViewFinancialValues(
  usuario: Usuario | null | undefined,
  equipe?: ViewerEquipe | null,
): boolean {
  if (!usuario?.ativo) return false;
  if (isAdmin(usuario)) return true;
  if (equipe?.ativo && equipeMatchesStage(equipe, "financial_review")) {
    return true;
  }
  return false;
}
