import {
  formatMoneyUsd,
  moneyInputFromNumber,
  parseValorTotalInput,
} from "@/lib/ordens-servico/financial-workspace";

export type OsValoresEtapa = {
  valor_comercial?: number | string | null;
  valor_projeto?: number | string | null;
  valor_final?: number | string | null;
  /** Legado — usado só como fallback de leitura. */
  valor_previsto?: number | string | null;
};

function toMoney(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export function formatOsValorUsd(value: number | string | null | undefined): string {
  const n = toMoney(value);
  if (n == null) return "—";
  return formatMoneyUsd(n);
}

/** Valor contratado efetivo para saldo / instalação (prioridade: final → projeto → comercial → legado). */
export function valorContratadoEfetivo(os: OsValoresEtapa): number {
  return (
    toMoney(os.valor_final) ??
    toMoney(os.valor_projeto) ??
    toMoney(os.valor_comercial) ??
    toMoney(os.valor_previsto) ??
    0
  );
}

export function initialValorComercialInput(os: OsValoresEtapa): string {
  return moneyInputFromNumber(os.valor_comercial);
}

export function initialValorProjetoInput(os: OsValoresEtapa): string {
  return moneyInputFromNumber(os.valor_projeto ?? os.valor_comercial);
}

export function initialValorFinalInput(os: OsValoresEtapa): string {
  return moneyInputFromNumber(os.valor_final ?? os.valor_projeto ?? os.valor_comercial);
}

export function parseValorEtapaInput(
  raw: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  return parseValorTotalInput(raw);
}
