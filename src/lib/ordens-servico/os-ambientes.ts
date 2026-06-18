import { parseValorEtapaInput } from "@/lib/ordens-servico/os-valores-etapa";
import type { OsAmbiente } from "@/lib/types/database";

export const OS_AMBIENTES_MAX = 10;

export type OsAmbienteFormRow = {
  id: string;
  nome: string;
  especificacoes: string;
  valor_comercial: string;
};

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
