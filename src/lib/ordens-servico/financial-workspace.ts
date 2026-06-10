import { t } from "@/lib/i18n";
import { valorContratadoEfetivo } from "@/lib/ordens-servico/os-valores-etapa";
import {
  formatVisitPaymentAmountUsd,
  formatVisitPaymentCardLine,
  hasVisitPaymentCapture,
} from "@/lib/ordens-servico/visit-payment";

export const FINANCIAL_DECISIONS = ["pending", "approved", "rejected"] as const;
export type FinancialDecision = (typeof FINANCIAL_DECISIONS)[number];

export function parseFinancialDecision(
  raw: string | null | undefined,
): FinancialDecision {
  const v = String(raw ?? "pending").trim().toLowerCase();
  return FINANCIAL_DECISIONS.includes(v as FinancialDecision)
    ? (v as FinancialDecision)
    : "pending";
}

export type FinancialWorkspaceSummary = {
  total: number;
  received: number;
  balance: number;
  receivedLine: string;
  hasPaymentCapture: boolean;
};

export function buildFinancialWorkspaceSummary(
  os: {
    valor_final?: number | string | null;
    valor_projeto?: number | string | null;
    valor_comercial?: number | string | null;
    valor_previsto?: number | string | null;
    visit_payment_received?: boolean | null;
    visit_payment_amount?: number | string | null;
    visit_payment_method?: string | null;
    status_atual?: string | null;
  },
  options?: { totalInput?: string },
): FinancialWorkspaceSummary {
  let total = valorContratadoEfetivo(os);

  if (options?.totalInput !== undefined && options.totalInput.trim()) {
    const parsed = parseValorTotalInput(options.totalInput);
    if (parsed.ok && parsed.value != null) {
      total = parsed.value;
    }
  }

  const received = os.visit_payment_received
    ? toMoneyNumber(os.visit_payment_amount)
    : 0;
  const balance = Math.max(0, Math.round((total - received) * 100) / 100);

  return {
    total,
    received,
    balance,
    receivedLine: formatVisitPaymentCardLine(os, {
      awaitingEntry: t("os.card.financial.noPayment"),
      noPayment: t("os.card.financial.noPayment"),
    }),
    hasPaymentCapture: hasVisitPaymentCapture(os),
  };
}

function toMoneyNumber(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function formatMoneyUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function splitMoneyTyping(raw: string): {
  intDigits: string;
  decDigits: string;
  trailingDot: boolean;
} {
  const sanitized = raw.replace(/[^\d.]/g, "");
  const dotIdx = sanitized.indexOf(".");
  if (dotIdx === -1) {
    return {
      intDigits: sanitized.replace(/\D/g, ""),
      decDigits: "",
      trailingDot: false,
    };
  }
  const intDigits = sanitized.slice(0, dotIdx).replace(/\D/g, "");
  const decDigits = sanitized.slice(dotIdx + 1).replace(/\./g, "").slice(0, 2);
  const trailingDot =
    sanitized.endsWith(".") && decDigits.length === 0 && dotIdx === sanitized.length - 1;
  return { intDigits, decDigits, trailingDot };
}

function formatMoneyIntegerPart(intDigits: string): string {
  if (!intDigits) return "0";
  const intNum = parseInt(intDigits, 10);
  if (!Number.isFinite(intNum)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(intNum);
}

/** Valor numérico → texto mascarado para input (ex.: $2,850.00). */
export function moneyInputFromNumber(
  value: number | string | null | undefined,
): string {
  if (value == null || value === "") return "";
  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return "";
  return formatMoneyUsd(n);
}

/** Aplica máscara USD enquanto o usuário digita (milhar + decimais). */
export function maskMoneyInputChange(raw: string): string {
  const { intDigits, decDigits, trailingDot } = splitMoneyTyping(raw);
  if (!intDigits && !decDigits && !trailingDot) return "";

  const intFormatted = formatMoneyIntegerPart(intDigits);
  const prefix = `$${intFormatted}`;

  if (trailingDot) return `${prefix}.`;
  if (decDigits.length > 0) return `${prefix}.${decDigits}`;
  return prefix;
}

/** Normaliza exibição ao sair do campo (sempre duas casas decimais). */
export function finalizeMoneyInputDisplay(raw: string): string {
  const parsed = parseValorTotalInput(raw);
  if (!parsed.ok || parsed.value == null) return maskMoneyInputChange(raw);
  return formatMoneyUsd(parsed.value);
}

export function parseValorTotalInput(
  raw: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };

  const { intDigits, decDigits } = splitMoneyTyping(trimmed);
  if (!intDigits && !decDigits) return { ok: true, value: null };

  const normalized = decDigits.length
    ? `${intDigits || "0"}.${decDigits.padEnd(2, "0").slice(0, 2)}`
    : intDigits;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, message: "Valor total inválido" };
  }
  return { ok: true, value: Math.round(value * 100) / 100 };
}

export type FinancialDecisionUi = {
  decision: FinancialDecision;
  label: string;
  tone: "pending" | "approved" | "rejected";
};

export function financialDecisionUi(
  decision: FinancialDecision,
): FinancialDecisionUi {
  switch (decision) {
    case "approved":
      return {
        decision,
        label: t("os.workspace.financial.statusApproved"),
        tone: "approved",
      };
    case "rejected":
      return {
        decision,
        label: t("os.workspace.financial.statusRejected"),
        tone: "rejected",
      };
    default:
      return {
        decision: "pending",
        label: t("os.workspace.financial.statusPending"),
        tone: "pending",
      };
  }
}
