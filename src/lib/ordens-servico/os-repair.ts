import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import type { OrdemServico, OsRepairEpisode } from "@/lib/types/database";

export function isOsElegivelRepair(os: Pick<OrdemServico, "status" | "etapa_atual" | "repair_ativo">): boolean {
  if (os.repair_ativo) return false;
  if (os.status !== "completed") return false;
  return parseOsStage(os.etapa_atual) === "completed";
}

export function repairValorAlterado(
  episode: Pick<OsRepairEpisode, "valor_sugerido" | "valor_final">,
): boolean {
  const sugerido = episode.valor_sugerido;
  const final = episode.valor_final;
  if (final == null) return sugerido != null;
  if (sugerido == null) return final != null;
  return Math.abs(Number(final) - Number(sugerido)) > 0.009;
}

export function validarObservacaoValorRepair(
  episode: Pick<OsRepairEpisode, "valor_sugerido" | "valor_final" | "valor_alteracao_observacao">,
): string | null {
  if (!repairValorAlterado(episode)) return null;
  if (!episode.valor_alteracao_observacao?.trim()) {
    return "Informe observações ao alterar o valor do reparo.";
  }
  return null;
}
