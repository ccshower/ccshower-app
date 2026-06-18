import type { AgendaEvent, AgendaTipo } from "@/lib/mock/centro-operacional/operational-dashboard";

export type AgendaGlobalEventoTemporal = "futuro" | "passado";

export type AgendaGlobalBadgeOperacional =
  | "bloqueado"
  | "atrasado"
  | "reagendado"
  | "cancelado";

/** Evento da Agenda Global — badge e lista usam o mesmo array. */
export type AgendaGlobalEvento = Omit<AgendaEvent, "status"> & {
  id: string;
  ordemServicoId: string;
  /** Passado = horário já ocorreu; futuro = ainda não começou. */
  temporal: AgendaGlobalEventoTemporal;
  /** Somente estados operacionais — null = sem badge. */
  badgeOperacional: AgendaGlobalBadgeOperacional | null;
};

export type { AgendaTipo };
export type AgendaGlobalResumoContadores = {
  visitas: number;
  instalacoes: number;
  projetos: number;
  financeiro: number;
};

export type AgendaGlobalDia = {
  ymd: string;
  eventos: AgendaGlobalEvento[];
  contadores: AgendaGlobalResumoContadores;
};

export type AgendaGlobalData = {
  hoje: AgendaGlobalDia;
  amanha: AgendaGlobalDia;
  semana: AgendaGlobalSemana;
  error: string | null;
};

/** Eventos agregados da semana operacional corrente. */
export type AgendaGlobalSemana = {
  inicioYmd: string;
  fimYmd: string;
  eventos: AgendaGlobalEvento[];
  contadores: AgendaGlobalResumoContadores;
};

export const AGENDA_GLOBAL_VAZIO: AgendaGlobalResumoContadores = {
  visitas: 0,
  instalacoes: 0,
  projetos: 0,
  financeiro: 0,
};
