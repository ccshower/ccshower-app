import { DISPLAY_LOCALE } from "@/lib/i18n";
import { agendaEventoStartIso } from "@/lib/ordens-servico/agenda-evento-query";
import {
  buildDataEventoIso,
  isoRangeDiaOperacional,
  OPERATIONAL_TZ,
  parseVisitaDateTime,
} from "@/lib/ordens-servico/datetime";

/** Duração padrão de cada slot de visita técnica (1h). */
export const VISITA_DURACAO_MINUTOS = 60;

/** Slots operacionais de visita (1h) — evolução futura: rota, região, trânsito. */
export const VISITA_SLOTS_HORARIOS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
] as const;

export type VisitaSlotHora = (typeof VISITA_SLOTS_HORARIOS)[number];

export type AgendaSlotSugestao = {
  dataYmd: string;
  hora: VisitaSlotHora;
};

export function hojeOperacionalYmd(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: OPERATIONAL_TZ });
}

export { isoRangeDiaOperacional };

/** Normaliza HH:mm para slot oficial (ex.: 09:00). */
export function normalizarSlotHora(hora: string): VisitaSlotHora | null {
  const m = hora.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const slot = `${m[1].padStart(2, "0")}:${m[2]}`;
  return VISITA_SLOTS_HORARIOS.includes(slot as VisitaSlotHora)
    ? (slot as VisitaSlotHora)
    : null;
}

export function slotsOcupadosFromEventos(
  eventos: {
    data_evento?: string | null;
    data_inicio?: string | null;
    hora_evento?: string | null;
    status?: string;
  }[],
): VisitaSlotHora[] {
  const set = new Set<VisitaSlotHora>();
  for (const ev of eventos) {
    if (ev.status === "cancelled" || ev.status === "cancelado") continue;
    const iso = agendaEventoStartIso(ev);
    if (!iso) continue;
    const { hora } = parseVisitaDateTime(iso);
    const slot = normalizarSlotHora(hora);
    if (slot) set.add(slot);
  }
  return [...set];
}

export function slotEstaOcupado(
  ocupados: readonly string[],
  hora: string,
): boolean {
  const slot = normalizarSlotHora(hora);
  if (!slot) return false;
  return ocupados.includes(slot);
}

function indicePrimeiroSlotAposHm(hm: string): number {
  const ref = normalizarSlotHora(hm);
  if (ref) {
    return VISITA_SLOTS_HORARIOS.indexOf(ref) + 1;
  }
  const idx = VISITA_SLOTS_HORARIOS.findIndex(
    (slot) => compararHm(slot, hm) > 0,
  );
  return idx < 0 ? VISITA_SLOTS_HORARIOS.length : idx;
}

/** Próximos slots livres após `aposHora` (mesma regra do agendamento de visitas). */
export function proximosSlotsDisponiveis(
  ocupados: readonly string[],
  aposHora: string,
  limite = 3,
): VisitaSlotHora[] {
  const startAt = indicePrimeiroSlotAposHm(aposHora);
  const out: VisitaSlotHora[] = [];

  for (
    let i = startAt;
    i < VISITA_SLOTS_HORARIOS.length && out.length < limite;
    i++
  ) {
    const slot = VISITA_SLOTS_HORARIOS[i];
    if (!slotEstaOcupado(ocupados, slot)) out.push(slot);
  }

  return out;
}

function sugestoesNoDia(
  dataYmd: string,
  ocupados: readonly string[],
  startAt: number,
  limite: number,
): AgendaSlotSugestao[] {
  const out: AgendaSlotSugestao[] = [];
  for (
    let i = startAt;
    i < VISITA_SLOTS_HORARIOS.length && out.length < limite;
    i++
  ) {
    const slot = VISITA_SLOTS_HORARIOS[i];
    if (!slotEstaOcupado(ocupados, slot)) {
      out.push({ dataYmd, hora: slot });
    }
  }
  return out;
}

/** Todos os slots livres do dia, do primeiro horário oficial. */
export function proximosSlotsDisponiveisNoDia(
  dataYmd: string,
  ocupados: readonly string[],
  limite = 3,
): AgendaSlotSugestao[] {
  return sugestoesNoDia(dataYmd, ocupados, 0, limite);
}

/** HH:mm no fuso operacional (hora de parede). */
export function horaOperacionalAgora(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: OPERATIONAL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

export function compararHm(a: string, b: string): number {
  const parse = (hm: string) => {
    const m = hm.trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m) return 0;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  return parse(a) - parse(b);
}

/** Horário já passou no dia operacional de hoje. */
export function horarioOperacionalJaPassou(dataVisita: string, hm: string): boolean {
  if (dataVisita !== hojeOperacionalYmd()) return false;
  return compararHm(hm, horaOperacionalAgora()) <= 0;
}

/** Próximos slots livres a partir de agora (somente para hoje). */
export function proximosSlotsDisponiveisHoje(
  dataYmd: string,
  ocupados: readonly string[],
  limite = 3,
): AgendaSlotSugestao[] {
  const agora = horaOperacionalAgora();
  const agoraMin = compararHm(agora, "00:00");
  let startAt = VISITA_SLOTS_HORARIOS.findIndex((slot) => {
    const slotMin = compararHm(slot, "00:00");
    return slotMin >= agoraMin;
  });
  if (startAt < 0) return [];

  return sugestoesNoDia(dataYmd, ocupados, startAt, limite);
}

export function formatDataVisitaCurta(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const iso = buildDataEventoIso(ymd, "12:00");
  if (!iso) return ymd;
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: OPERATIONAL_TZ,
  }).format(new Date(iso));
}

/** Dias do mês para mini calendário (null = célula vazia). */
export function diasDoMesCalendario(
  year: number,
  monthIndex: number,
): (string | null)[] {
  const first = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: (string | null)[] = [];

  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) {
    const m = String(monthIndex + 1).padStart(2, "0");
    const day = String(d).padStart(2, "0");
    cells.push(`${year}-${m}-${day}`);
  }
  return cells;
}

export function compararYmd(a: string, b: string): number {
  return a.localeCompare(b);
}
