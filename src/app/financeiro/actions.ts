"use server";

import { loadFinanceiroOperacional } from "@/lib/financeiro-operacional/load-financeiro-operacional";

export async function loadFinanceiroOperacionalAction(unidadeId?: string | null) {
  return loadFinanceiroOperacional(unidadeId);
}
