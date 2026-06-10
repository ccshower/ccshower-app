export { formatOperacionalDateTime as formatWorkspaceDateTime } from "@/lib/ordens-servico/datetime";

/** Endereço em uma linha para leitura rápida no campo. */
export function resumirEndereco(
  endereco: string | null | undefined,
  maxLen = 52,
): string {
  const t = String(endereco ?? "").trim();
  if (!t) return "—";
  const oneLine = t.replace(/\s+/g, " ");
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, maxLen - 1)}…`;
}
