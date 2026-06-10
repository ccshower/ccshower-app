import { parseFinancialDecision } from "@/lib/ordens-servico/financial-workspace";
import { isFormaPagamentoFinanciamento } from "@/lib/ordens-servico/os-financiamento";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";

export type FinanceiroAguardandoAprovacao = {
  aguardandoAprovacao: number;
  financiamentosPendentes: number;
  reprovados: number;
};

export type FinanceiroClienteEmAbertoStatus = "quitado" | "parcial" | "em_aberto";

export type FinanceiroClienteEmAbertoItem = {
  osId: string;
  osTitulo: string | null;
  clienteNome: string;
  valorTotal: number;
  recebido: number;
  saldo: number;
  status: FinanceiroClienteEmAbertoStatus;
};

export type FinanceiroOperacionalData = {
  aguardando: FinanceiroAguardandoAprovacao;
  faturadoNoMes: number;
  /** Indicador provisório — futura fonte: integração Bill. */
  recebidoNoMes: number;
  clientesEmAberto: FinanceiroClienteEmAbertoItem[];
  error: string | null;
};

export const FINANCEIRO_OPERACIONAL_VAZIO: FinanceiroOperacionalData = {
  aguardando: {
    aguardandoAprovacao: 0,
    financiamentosPendentes: 0,
    reprovados: 0,
  },
  faturadoNoMes: 0,
  recebidoNoMes: 0,
  clientesEmAberto: [],
  error: null,
};

const OS_OPEN_STATUSES = new Set(["open", "scheduled", "in_progress"]);

export type OsFinanceiroRow = {
  id: string;
  titulo?: string | null;
  cliente_id?: string | null;
  status: string;
  etapa_atual: string | null;
  financial_decision: string | null;
  forma_pagamento: string | null;
  valor_final: number | string | null;
  visit_payment_amount: number | string | null;
  installation_payment_amount: number | string | null;
  visit_payment_received?: boolean | null;
  installation_payment_received?: boolean | null;
  atualizado_em?: string | null;
};

function toMoney(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function isOsAtiva(row: Pick<OsFinanceiroRow, "status">): boolean {
  return OS_OPEN_STATUSES.has(row.status);
}

/** OS em financial_review aguardando decisão (regras do módulo financeiro). */
export function isOsAguardandoAprovacaoFinanceira(row: OsFinanceiroRow): boolean {
  if (!isOsAtiva(row)) return false;
  if (parseOsStage(row.etapa_atual) !== "financial_review") return false;
  return parseFinancialDecision(row.financial_decision) === "pending";
}

export function isOsFinanciamentoPendente(row: OsFinanceiroRow): boolean {
  return isOsAguardandoAprovacaoFinanceira(row) && isFormaPagamentoFinanciamento(row.forma_pagamento);
}

export function isOsReprovadaFinanceiro(row: OsFinanceiroRow): boolean {
  if (!isOsAtiva(row)) return false;
  if (parseOsStage(row.etapa_atual) !== "financial_review") return false;
  return parseFinancialDecision(row.financial_decision) === "rejected";
}

export function calcRecebidoOperacional(row: OsFinanceiroRow): number {
  return toMoney(row.visit_payment_amount) + toMoney(row.installation_payment_amount);
}

/**
 * Recebido no mês (provisório): soma valores somente com confirmação de recebimento.
 * TODO(Bill): substituir por lançamentos confirmados na integração Bill.
 */
export function calcRecebidoConfirmadoOperacional(row: OsFinanceiroRow): number {
  let sum = 0;
  if (row.visit_payment_received) {
    sum += toMoney(row.visit_payment_amount);
  }
  if (row.installation_payment_received) {
    sum += toMoney(row.installation_payment_amount);
  }
  return sum;
}

export function calcSaldoOperacional(valorTotal: number, recebido: number): number {
  return Math.round((valorTotal - recebido) * 100) / 100;
}

export function resolveClienteEmAbertoStatus(
  recebido: number,
  saldo: number,
): FinanceiroClienteEmAbertoStatus {
  if (saldo <= 0) return "quitado";
  if (recebido > 0) return "parcial";
  return "em_aberto";
}

export function buildAguardandoAprovacao(rows: OsFinanceiroRow[]): FinanceiroAguardandoAprovacao {
  return {
    aguardandoAprovacao: rows.filter(isOsAguardandoAprovacaoFinanceira).length,
    financiamentosPendentes: rows.filter(isOsFinanciamentoPendente).length,
    reprovados: rows.filter(isOsReprovadaFinanceiro).length,
  };
}

export function somaValorFinal(rows: Pick<OsFinanceiroRow, "valor_final">[]): number {
  return rows.reduce((acc, row) => {
    const n = toMoney(row.valor_final);
    if (n <= 0) return acc;
    return acc + n;
  }, 0);
}

function resolveClienteNome(
  row: OsFinanceiroRow,
  clienteMap: Map<string, string>,
): string {
  const fromMap = row.cliente_id ? clienteMap.get(row.cliente_id)?.trim() : null;
  if (fromMap) return fromMap;
  return "Unnamed client";
}

export function buildClientesEmAberto(
  rows: OsFinanceiroRow[],
  clienteMap: Map<string, string>,
): FinanceiroClienteEmAbertoItem[] {
  const items: FinanceiroClienteEmAbertoItem[] = [];

  for (const row of rows) {
    const valorTotal = toMoney(row.valor_final);
    if (valorTotal <= 0) continue;

    const recebido = calcRecebidoOperacional(row);
    const saldo = calcSaldoOperacional(valorTotal, recebido);
    if (saldo <= 0) continue;

    items.push({
      osId: row.id,
      osTitulo: row.titulo?.trim() || null,
      clienteNome: resolveClienteNome(row, clienteMap),
      valorTotal,
      recebido,
      saldo,
      status: resolveClienteEmAbertoStatus(recebido, saldo),
    });
  }

  return items.sort((a, b) => {
    if (b.saldo !== a.saldo) return b.saldo - a.saldo;
    return a.saldo - b.saldo;
  });
}

export function formatFinanceiroValor(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

export const CLIENTE_EM_ABERTO_STATUS_UI: Record<
  FinanceiroClienteEmAbertoStatus,
  { label: string; dot: string; badge: string }
> = {
  quitado: {
    label: "Paid off",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-800",
  },
  parcial: {
    label: "Partial",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-900",
  },
  em_aberto: {
    label: "Outstanding",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-800",
  },
};
