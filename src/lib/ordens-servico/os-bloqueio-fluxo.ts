import { BLOQUEIO_STATUS_ATIVO } from "@/lib/ordens-servico/bloqueio-operacional";
import type { OrdemServicoWithRelations, OsCrash } from "@/lib/types/database";

/** Mensagem oficial quando o fluxo está bloqueado (UI + server). */
export const MENSAGEM_OS_FLUXO_BLOQUEADO =
  "Esta OS possui um Bloqueio Operacional ativo. Resolva o bloqueio antes de continuar.";

export function isOsFluxoBloqueado(
  ordem: { bloqueio_ativo?: OsCrash | null },
): boolean {
  return ordem.bloqueio_ativo?.status === BLOQUEIO_STATUS_ATIVO;
}
