import {
  type OsValoresEtapa,
  valorContratadoEfetivo,
} from "@/lib/ordens-servico/os-valores-etapa";

export type OsDescontoFields = {
  desconto_valor?: number | string | null;
  desconto_justificativa?: string | null;
};

function toMoney(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function descontoOrdemValor(os: OsDescontoFields): number {
  return toMoney(os.desconto_valor);
}

export function ordemTemDesconto(os: OsDescontoFields): boolean {
  return descontoOrdemValor(os) > 0;
}

export function valorLiquidoComDesconto(
  valorBruto: number,
  desconto: number,
): number {
  return Math.max(0, Math.round((valorBruto - desconto) * 100) / 100);
}

/** Valor contratado efetivo menos desconto administrativo. */
export function valorContratadoLiquido(
  os: OsValoresEtapa & OsDescontoFields,
  valorBrutoOverride?: number,
): number {
  const bruto =
    valorBrutoOverride != null
      ? valorBrutoOverride
      : valorContratadoEfetivo(os);
  return valorLiquidoComDesconto(bruto, descontoOrdemValor(os));
}

export function validarDescontoOrdemServico(input: {
  valorRaw: string;
  justificativa: string;
  valorBruto: number;
}):
  | { ok: true; valor: number; justificativa: string }
  | { ok: false; message: string } {
  const justificativa = input.justificativa.trim();
  if (!justificativa) {
    return { ok: false, message: "Informe a justificativa do desconto." };
  }

  const trimmed = input.valorRaw.trim();
  if (!trimmed) {
    return { ok: false, message: "Informe o valor do desconto." };
  }

  const normalized = trimmed.replace(/^\$/, "").replace(/,/g, "");
  const valor = Number(normalized);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { ok: false, message: "Valor de desconto inválido." };
  }

  const rounded = Math.round(valor * 100) / 100;
  if (rounded > input.valorBruto) {
    return {
      ok: false,
      message: "O desconto não pode ser maior que o valor total da OS.",
    };
  }

  return { ok: true, valor: rounded, justificativa };
}
