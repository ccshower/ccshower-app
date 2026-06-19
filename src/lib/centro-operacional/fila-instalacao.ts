/** Fila Instalação — OS na etapa installation (pendente ou agendada). */

export type FilaInstalacaoItem = {
  osId: string;
  clienteId: string;
  clienteNome: string;
  equipeId: string | null;
  equipeNome: string | null;
  equipeCorPrimaria: string | null;
  statusAtual: string;
  instalacaoAgendada: boolean;
  /** Texto formatado da data/hora da instalação, se agendada. */
  instalacaoQuando: string | null;
  isRepair: boolean;
  atualizadoEm: string;
};

export const filaInstalacaoStatusConfig: Record<
  "installation_pending" | "installation_scheduled" | "installation_in_progress" | "default",
  { label: string; dot: string; badge: string }
> = {
  installation_pending: {
    label: "PENDING",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800",
  },
  installation_scheduled: {
    label: "SCHEDULED",
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-800",
  },
  installation_in_progress: {
    label: "IN PROGRESS",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-800",
  },
  default: {
    label: "INSTALLATION",
    dot: "bg-cc-muted",
    badge: "bg-cc-canvas text-cc-muted",
  },
};

export function filaInstalacaoStatusBadge(statusAtual: string) {
  if (statusAtual === "installation_pending") {
    return filaInstalacaoStatusConfig.installation_pending;
  }
  if (statusAtual === "installation_scheduled") {
    return filaInstalacaoStatusConfig.installation_scheduled;
  }
  if (statusAtual === "installation_in_progress") {
    return filaInstalacaoStatusConfig.installation_in_progress;
  }
  return filaInstalacaoStatusConfig.default;
}
