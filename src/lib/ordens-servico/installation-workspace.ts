import { valorContratadoLiquido } from "@/lib/ordens-servico/os-desconto";
import { moneyInputFromNumber, parseValorTotalInput } from "@/lib/ordens-servico/financial-workspace";
import {
  parseVisitPaymentMethod,
  type VisitPaymentMethod,
} from "@/lib/ordens-servico/visit-payment";

export type InstallationPaymentCapture = {
  received: boolean;
  amount: string;
  method: VisitPaymentMethod | "";
  notes: string;
};

function toMoneyNumber(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function installationPaymentFromOrdem(os: {
  installation_payment_received?: boolean | null;
  installation_payment_amount?: number | string | null;
  installation_payment_method?: string | null;
  installation_payment_notes?: string | null;
}): InstallationPaymentCapture {
  const amount =
    os.installation_payment_amount != null && os.installation_payment_amount !== ""
      ? moneyInputFromNumber(os.installation_payment_amount)
      : "";
  return {
    received: Boolean(os.installation_payment_received),
    amount,
    method: parseVisitPaymentMethod(os.installation_payment_method) ?? "",
    notes: String(os.installation_payment_notes ?? "").trim(),
  };
}

export type InstallationFinancialStatus = {
  balance: number;
  isPaid: boolean;
};

/** Saldo pendente na instalação — visita + instalação, sem expor financeiro completo. */
export function buildInstallationFinancialStatus(os: {
  valor_final?: number | string | null;
  valor_projeto?: number | string | null;
  valor_comercial?: number | string | null;
  valor_previsto?: number | string | null;
  desconto_valor?: number | string | null;
  visit_payment_received?: boolean | null;
  visit_payment_amount?: number | string | null;
  installation_payment_received?: boolean | null;
  installation_payment_amount?: number | string | null;
}): InstallationFinancialStatus {
  const total = valorContratadoLiquido(os);
  const visitReceived = os.visit_payment_received
    ? toMoneyNumber(os.visit_payment_amount)
    : 0;
  const installationReceived = os.installation_payment_received
    ? toMoneyNumber(os.installation_payment_amount)
    : 0;
  const balance = Math.max(
    0,
    Math.round((total - visitReceived - installationReceived) * 100) / 100,
  );
  return { balance, isPaid: balance <= 0 };
}

export function formatInstallationBalance(balance: number): string {
  return formatMoneyUsd(balance);
}

function formatMoneyUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseInstallationPaymentAmount(
  raw: string,
): { ok: true; value: number } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: "Informe o valor recebido" };
  }
  const parsed = parseValorTotalInput(trimmed.replace(/^\$/, ""));
  if (!parsed.ok) return parsed;
  if (parsed.value == null || parsed.value <= 0) {
    return { ok: false, message: "Informe o valor recebido" };
  }
  return { ok: true, value: parsed.value };
}

export function isSeparationItemChecked(item: {
  quantity: number | string;
  qty_checked: number | string;
}): boolean {
  return toMoneyNumber(item.qty_checked) >= toMoneyNumber(item.quantity);
}

export function countSeparationConference(items: {
  quantity: number | string;
  qty_checked: number | string;
}[]) {
  const total = items.length;
  const checked = items.filter(isSeparationItemChecked).length;
  return {
    total,
    checked,
    allChecked: total > 0 && checked === total,
  };
}
