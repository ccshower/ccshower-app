/** Fila comercial — OS aguardando primeira visita (SEM VISITA) */

export type FilaComercialItem = {
  osId: string;
  clienteId: string;
  clienteNome: string;
  equipeId: string | null;
  equipeNome: string | null;
  equipeCorPrimaria: string | null;
  criadoEm: string;
};

export const filaComercialStatusConfig = {
  label: "NO VISIT",
  dot: "bg-cc-blue",
  badge: "bg-cc-blue-soft text-cc-blue-deep",
} as const;

export function formatDataCadastro(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}
