import {
  agendaEventoStartIso,
  compareAgendaEventoStartAsc,
  type AgendaEventoDatetimeFields,
} from "@/lib/ordens-servico/agenda-evento-query";
import { operationalWallClockHm } from "@/lib/calendar/operational-calendar";
import { parseVisitaDateTime } from "@/lib/ordens-servico/datetime";

/** Ponto de parada para futuro cálculo de rotas (ex.: Google Routes API). */
export type RotaParadaAgenda = {
  eventoId: string;
  clienteId: string;
  clienteNome: string;
  /** HH:mm no fuso operacional. */
  hora: string;
  enderecoFormatado: string | null;
  latitude: number | null;
  longitude: number | null;
};

/** Compromisso da equipe no dia — exibição no agendamento. */
export type CompromissoEquipeDia = {
  id: string;
  hora: string;
  clienteNome: string;
  parada: RotaParadaAgenda;
};

export type AgendaEquipeDiaResumo = {
  compromissos: CompromissoEquipeDia[];
  /** Paradas ordenadas por hora — input para futura otimização de rotas. */
  paradasRota: RotaParadaAgenda[];
};

type ClienteAgendaRow = {
  nome?: string | null;
  endereco_formatado?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type AgendaEventoEquipeDiaRow = AgendaEventoDatetimeFields & {
  id: string;
  cliente_id: string;
  status?: string;
  tipo_evento: string;
  titulo?: string | null;
  clientes?: ClienteAgendaRow | ClienteAgendaRow[] | null;
};

function resolverCliente(row: AgendaEventoEquipeDiaRow): ClienteAgendaRow | null {
  const c = row.clientes;
  if (!c) return null;
  return Array.isArray(c) ? (c[0] ?? null) : c;
}

function resolverHoraOperacional(
  evento: AgendaEventoDatetimeFields,
): string | null {
  const iso = agendaEventoStartIso(evento);
  if (!iso) return null;
  return (
    operationalWallClockHm(iso) ??
    parseVisitaDateTime(iso).hora.slice(0, 5) ??
    null
  );
}

function resolverClienteNome(
  row: AgendaEventoEquipeDiaRow,
  cliente: ClienteAgendaRow | null,
): string {
  const nome = cliente?.nome?.trim();
  if (nome) return nome;
  const titulo = row.titulo?.trim();
  if (titulo) return titulo;
  return "Cliente";
}

/** Normaliza linhas de agenda_eventos para UI e estrutura de rotas. */
export function mapAgendaEquipeDiaResumo(
  eventos: AgendaEventoEquipeDiaRow[],
): AgendaEquipeDiaResumo {
  const sorted = [...eventos].sort(compareAgendaEventoStartAsc);
  const compromissos: CompromissoEquipeDia[] = [];
  const paradasRota: RotaParadaAgenda[] = [];

  for (const ev of sorted) {
    const hora = resolverHoraOperacional(ev);
    if (!hora) continue;

    const cliente = resolverCliente(ev);
    const clienteNome = resolverClienteNome(ev, cliente);
    const parada: RotaParadaAgenda = {
      eventoId: ev.id,
      clienteId: ev.cliente_id,
      clienteNome,
      hora,
      enderecoFormatado: cliente?.endereco_formatado?.trim() || null,
      latitude: cliente?.latitude ?? null,
      longitude: cliente?.longitude ?? null,
    };

    paradasRota.push(parada);
    compromissos.push({
      id: ev.id,
      hora,
      clienteNome,
      parada,
    });
  }

  return { compromissos, paradasRota };
}
