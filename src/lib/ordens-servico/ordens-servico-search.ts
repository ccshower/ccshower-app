import { tOsStage, tOsStatus } from "@/lib/i18n";
import { labelOperationalStatus } from "@/lib/ordens-servico/operacional-snapshot";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

/** Busca por nome, telefone e endereço do cliente (+ título e equipe). */
export function ordemServicoMatchesSearch(
  os: OrdemServicoWithRelations,
  rawQuery: string,
): boolean {
  const q = normalizeSearchText(rawQuery);
  if (!q) return true;

  const cliente = os.cliente;
  const haystack = [
    os.titulo,
    cliente?.nome,
    cliente?.telefone,
    cliente?.endereco_formatado,
    cliente?.endereco_linha1,
    cliente?.cidade,
    cliente?.estado,
    cliente?.cep,
    os.equipe?.nome,
    os.responsavel?.nome,
    tOsStatus(os.status),
    tOsStage(os.etapa_atual),
    labelOperationalStatus(os.status_atual),
  ]
    .filter(Boolean)
    .map((v) => normalizeSearchText(String(v)));

  return haystack.some((v) => v.includes(q));
}
