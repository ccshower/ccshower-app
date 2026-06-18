/** Financial queue — OS in financial_review awaiting action. */

import type { FinancialDecision } from "@/lib/ordens-servico/financial-workspace";

export type FilaFinanceiroItem = {
  osId: string;
  clienteId: string;
  clienteNome: string;
  equipeId: string | null;
  equipeNome: string | null;
  equipeCorPrimaria: string | null;
  statusAtual: string;
  financialDecision: FinancialDecision;
  valorFinal: number | null;
  atualizadoEm: string;
};

export const filaFinanceiroStatusConfig: Record<
  "financial_pending" | "financial_in_progress" | "default",
  { label: string; dot: string; badge: string }
> = {
  financial_pending: {
    label: "PENDING",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800",
  },
  financial_in_progress: {
    label: "IN REVIEW",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-800",
  },
  default: {
    label: "FINANCIAL",
    dot: "bg-cc-muted",
    badge: "bg-cc-canvas text-cc-muted",
  },
};

export const filaFinanceiroDecisionConfig: Record<
  FinancialDecision,
  { label: string; badge: string }
> = {
  pending: {
    label: "Awaiting approval",
    badge: "text-amber-700",
  },
  approved: {
    label: "Approved",
    badge: "text-emerald-700",
  },
  rejected: {
    label: "Rejected",
    badge: "text-red-700",
  },
};

export function filaFinanceiroStatusBadge(statusAtual: string) {
  if (statusAtual === "financial_pending") {
    return filaFinanceiroStatusConfig.financial_pending;
  }
  if (statusAtual === "financial_in_progress") {
    return filaFinanceiroStatusConfig.financial_in_progress;
  }
  return filaFinanceiroStatusConfig.default;
}

export { formatDataCadastro } from "@/lib/centro-operacional/fila-comercial";
