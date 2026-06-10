import type { ClienteOsResumo, OrdemServicoStatus } from "@/lib/types/database";

type OsRow = {
  id: string;
  cliente_id: string;
  titulo: string;
  status: OrdemServicoStatus;
  atualizado_em: string;
  etapa_atual: string;
  status_atual: string;
  equipe_atual: { id: string; nome: string; cor_primaria: string } | null;
  equipe_legacy: { nome: string; cor_primaria: string } | null;
};

export function buildOsPorCliente(rows: OsRow[]): Record<string, ClienteOsResumo[]> {
  const map: Record<string, ClienteOsResumo[]> = {};

  for (const row of rows) {
    const item: ClienteOsResumo = {
      id: row.id,
      cliente_id: row.cliente_id,
      titulo: row.titulo,
      status: row.status,
      atualizado_em: row.atualizado_em,
      etapa_atual: row.etapa_atual,
      status_atual: row.status_atual,
      equipe_atual: row.equipe_atual,
      equipe: row.equipe_atual
        ? {
            nome: row.equipe_atual.nome,
            cor_primaria: row.equipe_atual.cor_primaria,
          }
        : row.equipe_legacy,
    };
    if (!map[row.cliente_id]) map[row.cliente_id] = [];
    map[row.cliente_id].push(item);
  }

  return map;
}
