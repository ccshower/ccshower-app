/** Fila Install Schedule — OS aguardando agendamento da instalação. */

export type FilaInstallScheduleItem = {
  osId: string;
  clienteId: string;
  clienteNome: string;
  equipeId: string | null;
  equipeNome: string | null;
  equipeCorPrimaria: string | null;
  statusAtual: string;
  instalacaoAgendada: boolean;
  instalacaoQuando: string | null;
  dataPrevistaMaterial: string | null;
  atualizadoEm: string;
};

export const filaInstallScheduleStatusConfig: Record<
  | "install_schedule_pending"
  | "install_schedule_in_progress"
  | "installation_scheduled"
  | "default",
  { label: string; dot: string; badge: string }
> = {
  install_schedule_pending: {
    label: "PENDING",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800",
  },
  install_schedule_in_progress: {
    label: "SCHEDULING",
    dot: "bg-indigo-500",
    badge: "bg-indigo-50 text-indigo-800",
  },
  installation_scheduled: {
    label: "SCHEDULED",
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-800",
  },
  default: {
    label: "INSTALL SCHEDULE",
    dot: "bg-cc-muted",
    badge: "bg-cc-canvas text-cc-muted",
  },
};

export function filaInstallScheduleStatusBadge(statusAtual: string) {
  if (statusAtual === "install_schedule_pending") {
    return filaInstallScheduleStatusConfig.install_schedule_pending;
  }
  if (statusAtual === "install_schedule_in_progress") {
    return filaInstallScheduleStatusConfig.install_schedule_in_progress;
  }
  if (statusAtual === "installation_scheduled") {
    return filaInstallScheduleStatusConfig.installation_scheduled;
  }
  return filaInstallScheduleStatusConfig.default;
}
