/** Meta mensal fixa até existir configuração administrativa. */
export const PRODUCAO_MENSAL_META = 250_000;

export type ProducaoMensalData = {
  metaMensal: number;
  valorRealizado: number;
  instalacoesConcluidas: number;
  error: string | null;
};

export function getProducaoMensalPercentual(data: Pick<ProducaoMensalData, "valorRealizado" | "metaMensal">): number {
  if (data.metaMensal <= 0) return 0;
  return Math.floor((data.valorRealizado / data.metaMensal) * 100);
}

export function formatProducaoValor(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export const PRODUCAO_MENSAL_VAZIO: ProducaoMensalData = {
  metaMensal: PRODUCAO_MENSAL_META,
  valorRealizado: 0,
  instalacoesConcluidas: 0,
  error: null,
};
