import { parseValorEtapaInput } from "@/lib/ordens-servico/os-valores-etapa";
import type { OsAmbiente, OsAnexoComUrl } from "@/lib/types/database";

export const OS_AMBIENTES_MAX = 10;

export type OsAmbienteFormRow = {
  id: string;
  nome: string;
  especificacoes: string;
  valor_comercial: string;
};

export type AmbientePhotoGroup = {
  ambienteId: string;
  nome: string;
  especificacoes: string | null;
  valor_comercial: number | null;
  fotos: OsAnexoComUrl[];
};

export type VisitPhotoPreviewItem = OsAnexoComUrl & {
  ambienteId: string | null;
  ambienteNome: string | null;
};

/** Agrupa fotos da visita por ambiente; fotos sem vínculo ficam em orphans. */
export function groupVisitPhotosByAmbiente(
  anexos: OsAnexoComUrl[],
  ambientes: OsAmbiente[],
): { groups: AmbientePhotoGroup[]; orphans: OsAnexoComUrl[] } {
  return groupAnexosByAmbiente(anexos, ambientes);
}

/** Agrupa anexos (fotos, CNC, etc.) por ambiente. */
export function groupAnexosByAmbiente(
  anexos: OsAnexoComUrl[],
  ambientes: OsAmbiente[],
): { groups: AmbientePhotoGroup[]; orphans: OsAnexoComUrl[] } {
  const map = new Map<string, OsAnexoComUrl[]>();
  const orphans: OsAnexoComUrl[] = [];

  for (const a of anexos) {
    if (a.os_ambiente_id) {
      const list = map.get(a.os_ambiente_id) ?? [];
      list.push(a);
      map.set(a.os_ambiente_id, list);
    } else {
      orphans.push(a);
    }
  }

  const groups = ambientes.map((amb) => ({
    ambienteId: amb.id,
    nome: amb.nome,
    especificacoes: amb.especificacoes,
    valor_comercial: amb.valor_comercial,
    fotos: map.get(amb.id) ?? [],
  }));

  return { groups, orphans };
}

export function flattenVisitPhotosForPreview(
  groups: AmbientePhotoGroup[],
  orphans: OsAnexoComUrl[],
  generalLabel: string,
): VisitPhotoPreviewItem[] {
  const flat: VisitPhotoPreviewItem[] = [];
  for (const group of groups) {
    for (const foto of group.fotos) {
      flat.push({
        ...foto,
        ambienteId: group.ambienteId,
        ambienteNome: group.nome,
      });
    }
  }
  for (const foto of orphans) {
    flat.push({
      ...foto,
      ambienteId: null,
      ambienteNome: generalLabel,
    });
  }
  return flat;
}

export function createEmptyAmbienteRow(): OsAmbienteFormRow {
  return {
    id: crypto.randomUUID(),
    nome: "",
    especificacoes: "",
    valor_comercial: "",
  };
}

export function ambienteRowFromDb(row: OsAmbiente): OsAmbienteFormRow {
  const valor = row.valor_comercial;
  return {
    id: row.id,
    nome: row.nome,
    especificacoes: row.especificacoes ?? "",
    valor_comercial:
      valor != null && Number.isFinite(Number(valor)) && Number(valor) > 0
        ? String(valor)
        : "",
  };
}

export function parseAmbienteValorInput(raw: string): number | null {
  const parsed = parseValorEtapaInput(raw);
  if (!parsed.ok) return null;
  return parsed.value;
}

/** Soma dos valores parciais informados nos ambientes (para pré-preencher total da OS). */
export function somaValoresAmbientes(rows: OsAmbienteFormRow[]): number {
  return rows.reduce((acc, row) => {
    const n = parseAmbienteValorInput(row.valor_comercial);
    if (n == null || n <= 0) return acc;
    return Math.round((acc + n) * 100) / 100;
  }, 0);
}

export function formatSomaAmbientesUsd(sum: number): string {
  if (sum <= 0) return "";
  return sum.toFixed(2);
}

export function formatAmbienteValorDisplay(raw: number | null | undefined): string {
  if (raw == null) return "";
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toFixed(2);
}
