import type { RotaParadaAgenda } from "@/lib/ordens-servico/agenda-equipe-dia";

/** Entrada para futura integração com Google Routes / Route Optimization API. */
export type RouteOptimizationInput = {
  paradas: RotaParadaAgenda[];
  /** Parada do compromisso em agendamento (ainda não persistido). */
  paradaProposta?: RotaParadaAgenda | null;
};

/** Monta payload de rota sem chamar APIs externas. */
export function buildRouteOptimizationInput(
  paradas: RotaParadaAgenda[],
  paradaProposta?: RotaParadaAgenda | null,
): RouteOptimizationInput {
  return {
    paradas,
    paradaProposta: paradaProposta ?? null,
  };
}
