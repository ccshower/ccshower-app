import {
  hasAgendaEventoStart,
} from "@/lib/ordens-servico/agenda-evento-query";
import {
  parseOsOperationalStatus,
  parseOsStage,
} from "@/lib/ordens-servico/operacional-snapshot";
import type { Cliente, OrdemServicoWithRelations } from "@/lib/types/database";

/** OS comercial aguardando primeiro agendamento (SEM VISITA). */
export function isOsAgendamentoVisita(
  os: Pick<OrdemServicoWithRelations, "etapa_atual" | "status_atual">,
): boolean {
  if (parseOsStage(os.etapa_atual) !== "commercial") return false;
  return parseOsOperationalStatus(os.status_atual) === "no_visit";
}

/** OS na etapa commercial com visita agendada — painel de execução (não CRUD). */
export function isVisitaComercialExecucao(
  os: Pick<
    OrdemServicoWithRelations,
    "etapa_atual" | "status" | "status_atual" | "visita_inicial"
  >,
): boolean {
  if (parseOsStage(os.etapa_atual) !== "commercial") return false;
  if (os.status === "completed" || os.status === "cancelled") return false;
  if (isOsAgendamentoVisita(os)) return false;
  return (
    hasAgendaEventoStart(os.visita_inicial) ||
    parseOsOperationalStatus(os.status_atual) === "visit_scheduled" ||
    parseOsOperationalStatus(os.status_atual) === "visit_in_progress"
  );
}

export function clienteMapsUrl(
  cliente: Pick<
    Cliente,
    "google_maps_url" | "endereco_formatado" | "latitude" | "longitude"
  > | null,
): string | null {
  if (!cliente) return null;
  if (cliente.google_maps_url?.trim()) return cliente.google_maps_url.trim();
  if (cliente.latitude != null && cliente.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${cliente.latitude},${cliente.longitude}`;
  }
  if (cliente.endereco_formatado?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cliente.endereco_formatado)}`;
  }
  return null;
}

export const OS_ANEXO_TIPO_VISITA = "technical_visit" as const;
export const OS_ANEXO_TIPO_PAYMENT_RECEIPT = "payment_receipt" as const;
export const OS_ANEXO_TIPO_INSTALLATION = "installation" as const;
export const OS_ANEXO_TIPO_INSTALLATION_PAYMENT_RECEIPT =
  "installation_payment_receipt" as const;
export const OS_ANEXOS_BUCKET = "os-anexos";
