import { isOsAberta } from "@/lib/ordens-servico/open-status";
import type { ClienteOsResumo } from "@/lib/types/database";

export type AbrirOsClienteResult =
  | { action: "painel"; osId: string }
  | { action: "selecionar"; ordens: ClienteOsResumo[] }
  | { action: "criar" };

/**
 * Decide o fluxo ao clicar em "Abrir OS" no cliente.
 * - 1 OS aberta → /os/[id] (workspace)
 * - várias abertas → seletor → /os/[id]
 * - nenhuma aberta → modal "Nova Ordem de Serviço" (criação)
 */
export function resolverAbrirOsCliente(
  ordens: ClienteOsResumo[] | undefined,
): AbrirOsClienteResult {
  const lista = ordens ?? [];
  const abertas = lista.filter((o) => isOsAberta(o.status));

  if (abertas.length === 1) {
    return { action: "painel", osId: abertas[0].id };
  }
  if (abertas.length > 1) {
    return { action: "selecionar", ordens: abertas };
  }
  return { action: "criar" };
}
