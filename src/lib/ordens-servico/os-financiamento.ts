import { t } from "@/lib/i18n";
import {
  VISIT_PAYMENT_METHODS,
  parseVisitPaymentMethod,
  type VisitPaymentMethod,
} from "@/lib/ordens-servico/visit-payment";

export const FORMA_PAGAMENTO_FINANCING = "financing" as const;

/** Formas de pagamento da venda (inclui financiamento). */
export const FORMAS_PAGAMENTO_OS = VISIT_PAYMENT_METHODS;

export type FormaPagamentoOs = (typeof FORMAS_PAGAMENTO_OS)[number];

export function parseFormaPagamentoOs(
  raw: string | null | undefined,
): FormaPagamentoOs | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (v === FORMA_PAGAMENTO_FINANCING) return FORMA_PAGAMENTO_FINANCING;
  return parseVisitPaymentMethod(v);
}

export function isFormaPagamentoFinanciamento(
  forma: string | null | undefined,
): boolean {
  return parseFormaPagamentoOs(forma) === FORMA_PAGAMENTO_FINANCING;
}

export function tFormaPagamentoOs(method: string): string {
  if (method === FORMA_PAGAMENTO_FINANCING) {
    return t("os.financing.paymentMethod");
  }
  return t(`os.visitPayment.methodOption.${method}`);
}

export type FinanciamentoCapture = {
  forma_pagamento: FormaPagamentoOs | "";
  banco_financiamento: string;
};

export function financiamentoFromOrdem(os: {
  forma_pagamento?: string | null;
  banco_financiamento?: string | null;
}): FinanciamentoCapture {
  return {
    forma_pagamento: parseFormaPagamentoOs(os.forma_pagamento) ?? "",
    banco_financiamento: String(os.banco_financiamento ?? "").trim(),
  };
}

export function buildFinanciamentoUpdate(payload: FinanciamentoCapture):
  | {
      ok: true;
      row: {
        forma_pagamento: string | null;
        banco_financiamento: string | null;
      };
    }
  | { ok: false; message: string } {
  const forma = payload.forma_pagamento
    ? parseFormaPagamentoOs(payload.forma_pagamento)
    : null;
  if (payload.forma_pagamento && !forma) {
    return { ok: false, message: "Forma de pagamento inválida" };
  }

  if (!forma) {
    return {
      ok: true,
      row: {
        forma_pagamento: null,
        banco_financiamento: null,
      },
    };
  }

  if (forma !== FORMA_PAGAMENTO_FINANCING) {
    return {
      ok: true,
      row: {
        forma_pagamento: forma,
        banco_financiamento: null,
      },
    };
  }

  const banco = payload.banco_financiamento.trim();
  if (!banco) {
    return { ok: false, message: "Informe o banco financiador" };
  }

  return {
    ok: true,
    row: {
      forma_pagamento: FORMA_PAGAMENTO_FINANCING,
      banco_financiamento: banco,
    },
  };
}

/** Sincroniza forma_pagamento quando método da visita é financiamento. */
export function visitMethodToFormaPagamento(
  method: VisitPaymentMethod | "",
): FormaPagamentoOs | null {
  if (!method) return null;
  if (method === FORMA_PAGAMENTO_FINANCING) return FORMA_PAGAMENTO_FINANCING;
  return method;
}
