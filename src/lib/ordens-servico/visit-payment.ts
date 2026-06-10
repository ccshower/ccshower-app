/**
 * Captura operacional na visita comercial (ordens_servico.visit_payment_*).
 * O módulo financeiro deve revisar e promover — não usar estes campos como saldo oficial.
 * Ver docs/PRODUCT_RULES.md § Captura na visita comercial.
 */
import { t } from "@/lib/i18n";
import {
  moneyInputFromNumber,
  parseValorTotalInput,
} from "@/lib/ordens-servico/financial-workspace";

export const VISIT_PAYMENT_METHODS = [
  "cash",
  "check",
  "debit_card",
  "credit_card",
  "zelle",
  "financing",
] as const;

export type VisitPaymentMethod = (typeof VISIT_PAYMENT_METHODS)[number];

export function parseVisitPaymentMethod(
  raw: string | null | undefined,
): VisitPaymentMethod | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  return VISIT_PAYMENT_METHODS.includes(v as VisitPaymentMethod)
    ? (v as VisitPaymentMethod)
    : null;
}

export function tVisitPaymentMethod(method: string): string {
  if (method === "financing") return t("os.financing.paymentMethod");
  return t(`os.visitPayment.methodOption.${method}`);
}

export type VisitPaymentCapture = {
  received: boolean;
  amount: string;
  method: VisitPaymentMethod | "";
  notes: string;
};

export function visitPaymentFromOrdem(os: {
  visit_payment_received?: boolean | null;
  visit_payment_amount?: number | string | null;
  visit_payment_method?: string | null;
  visit_payment_notes?: string | null;
}): VisitPaymentCapture {
  const amount =
    os.visit_payment_amount != null && os.visit_payment_amount !== ""
      ? moneyInputFromNumber(os.visit_payment_amount)
      : "";
  return {
    received: Boolean(os.visit_payment_received),
    amount,
    method: parseVisitPaymentMethod(os.visit_payment_method) ?? "",
    notes: String(os.visit_payment_notes ?? "").trim(),
  };
}

export function formatVisitPaymentAmountUsd(
  amount: number | string | null | undefined,
): string | null {
  if (amount == null || amount === "") return null;
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

/** Há forma e/ou valor para exibir no card financeiro. */
export function hasVisitPaymentCapture(os: {
  visit_payment_received?: boolean | null;
  visit_payment_amount?: number | string | null;
  visit_payment_method?: string | null;
}): boolean {
  if (!os.visit_payment_received) return false;
  return (
    formatVisitPaymentAmountUsd(os.visit_payment_amount) != null ||
    parseVisitPaymentMethod(os.visit_payment_method) != null
  );
}

/** Linha compacta para card financeiro — ex.: "Zelle • $2,000". */
export function formatVisitPaymentCardLine(
  os: {
    visit_payment_received?: boolean | null;
    visit_payment_amount?: number | string | null;
    visit_payment_method?: string | null;
    status_atual?: string | null;
  },
  labels: { awaitingEntry: string; noPayment: string },
): string {
  const method = parseVisitPaymentMethod(os.visit_payment_method);
  const amount = formatVisitPaymentAmountUsd(os.visit_payment_amount);

  if (method || amount) {
    const methodLabel = method ? tVisitPaymentMethod(method) : null;
    if (methodLabel && amount) return `${methodLabel} • ${amount}`;
    return methodLabel ?? amount ?? labels.noPayment;
  }

  if (!os.visit_payment_received) {
    if (os.status_atual === "financial_pending") return labels.awaitingEntry;
    return labels.noPayment;
  }

  return labels.awaitingEntry;
}

export function parseVisitPaymentAmount(
  raw: string,
): { ok: true; value: number } | { ok: false; message: string } {
  const parsed = parseValorTotalInput(raw);
  if (!parsed.ok) return parsed;
  if (parsed.value == null) {
    return { ok: false, message: "Informe o valor recebido" };
  }
  return { ok: true, value: parsed.value };
}
