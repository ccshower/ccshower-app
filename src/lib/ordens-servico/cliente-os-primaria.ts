import { isOsAberta } from "@/lib/ordens-servico/open-status";
import type { ClienteOsResumo } from "@/lib/types/database";

/** OS aberta mais recente — referência da fila operacional do cliente. */
export function osOperacionalPrimaria(
  ordens: ClienteOsResumo[] | undefined,
): ClienteOsResumo | null {
  if (!ordens?.length) return null;

  const abertas = ordens.filter((o) => isOsAberta(o.status));
  const pool = abertas.length > 0 ? abertas : ordens;

  return [...pool].sort((a, b) =>
    b.atualizado_em.localeCompare(a.atualizado_em),
  )[0];
}
