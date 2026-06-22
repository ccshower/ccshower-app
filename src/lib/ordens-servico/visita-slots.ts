import { DISPLAY_LOCALE } from "@/lib/i18n";
import {
  agendaEventoEndIso,
  agendaEventoStartIso,
} from "@/lib/ordens-servico/agenda-evento-query";
import {
  buildDataEventoIso,
  isoRangeDiaOperacional,
  OPERATIONAL_TZ,
  parseVisitaDateTime,
} from "@/lib/ordens-servico/datetime";

/** Intervalo entre marcos de horário na agenda (visitas e instalações). */
export const AGENDA_SLOT_INTERVALO_MINUTOS = 30;

/** Primeiro horário disponível no dia operacional. */
export const AGENDA_HORARIO_INICIO = "08:00";

/** Último horário disponível (pode ser hora de término). */
export const AGENDA_HORARIO_FIM = "20:00";

/** Duração padrão quando não há hora fim explícita (legado / sugestões). */
export const VISITA_DURACAO_MINUTOS = 60;

export type VisitaSlotHora = string;

export type AgendaIntervaloOcupado = {
  inicio: VisitaSlotHora;
  fim: VisitaSlotHora;
};

export type AgendaSlotSugestao = {
  dataYmd: string;
  hora: VisitaSlotHora;
  horaFim: VisitaSlotHora;
};

function minutosDesdeMeiaNoite(hm: string): number {
  const m = hm.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return -1;
  return Number(m[1]) * 60 + Number(m[2]);
}

function hmFromMinutos(min: number): VisitaSlotHora {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function gerarHorariosAgenda(): VisitaSlotHora[] {
  const inicio = minutosDesdeMeiaNoite(AGENDA_HORARIO_INICIO);
  const fim = minutosDesdeMeiaNoite(AGENDA_HORARIO_FIM);
  const out: VisitaSlotHora[] = [];
  for (let min = inicio; min <= fim; min += AGENDA_SLOT_INTERVALO_MINUTOS) {
    out.push(hmFromMinutos(min));
  }
  return out;
}

/** Marcos de horário a cada 30 min — 08:00 … 20:00. */
export const VISITA_SLOTS_HORARIOS = gerarHorariosAgenda() as readonly VisitaSlotHora[];

export function hojeOperacionalYmd(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: OPERATIONAL_TZ });
}

export { isoRangeDiaOperacional };

/** Normaliza HH:mm para marco oficial (:00 ou :30 dentro da janela operacional). */
export function normalizarSlotHora(hora: string): VisitaSlotHora | null {
  const m = hora.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const mi = Number(m[2]);
  if (mi !== 0 && mi !== 30) return null;
  const slot = `${m[1].padStart(2, "0")}:${m[2]}`;
  return VISITA_SLOTS_HORARIOS.includes(slot) ? slot : null;
}

export function compararHm(a: string, b: string): number {
  return minutosDesdeMeiaNoite(a) - minutosDesdeMeiaNoite(b);
}

/** Horários de término válidos após o início (mínimo 30 min, até 20:30). */
export function horariosFimParaInicio(inicio: string): VisitaSlotHora[] {
  const inicioNorm = normalizarSlotHora(inicio);
  if (!inicioNorm) return [];
  const minInicio = minutosDesdeMeiaNoite(inicioNorm);
  const minFimMinimo = minInicio + AGENDA_SLOT_INTERVALO_MINUTOS;
  const maxFim = minutosDesdeMeiaNoite(AGENDA_HORARIO_FIM);
  return VISITA_SLOTS_HORARIOS.filter((slot) => {
    const min = minutosDesdeMeiaNoite(slot);
    return min >= minFimMinimo && min <= maxFim;
  });
}

export function horaFimPadraoParaInicio(inicio: string): VisitaSlotHora | null {
  const candidato = hmFromMinutos(
    minutosDesdeMeiaNoite(inicio) + VISITA_DURACAO_MINUTOS,
  );
  const norm = normalizarSlotHora(candidato);
  if (norm && compararHm(norm, inicio) > 0) return norm;
  const opcoes = horariosFimParaInicio(inicio);
  return opcoes[opcoes.length - 1] ?? null;
}

export function intervaloTemConflito(
  inicioHm: string,
  fimHm: string,
  ocupados: readonly AgendaIntervaloOcupado[],
): boolean {
  const a0 = minutosDesdeMeiaNoite(inicioHm);
  const a1 = minutosDesdeMeiaNoite(fimHm);
  if (a0 < 0 || a1 <= a0) return true;

  for (const o of ocupados) {
    const b0 = minutosDesdeMeiaNoite(o.inicio);
    const b1 = minutosDesdeMeiaNoite(o.fim);
    if (a0 < b1 && a1 > b0) return true;
  }
  return false;
}

export function intervalosOcupadosFromEventos(
  eventos: {
    data_evento?: string | null;
    data_inicio?: string | null;
    data_fim?: string | null;
    hora_evento?: string | null;
    status?: string;
  }[],
): AgendaIntervaloOcupado[] {
  const out: AgendaIntervaloOcupado[] = [];

  for (const ev of eventos) {
    if (ev.status === "cancelled" || ev.status === "cancelado") continue;
    const startIso = agendaEventoStartIso(ev);
    if (!startIso) continue;
    const endIso = agendaEventoEndIso(ev);
    if (!endIso) continue;

    const inicio = parseVisitaDateTime(startIso).hora.slice(0, 5);
    const fim = parseVisitaDateTime(endIso).hora.slice(0, 5);
    const inicioNorm = normalizarSlotHora(inicio);
    const fimNorm = normalizarSlotHora(fim) ?? horaFimPadraoParaInicio(inicio);
    if (!inicioNorm || !fimNorm || compararHm(fimNorm, inicioNorm) <= 0) continue;
    out.push({ inicio: inicioNorm, fim: fimNorm });
  }

  return out;
}

/** @deprecated Use intervalosOcupadosFromEventos — mantido para compatibilidade interna. */
export function slotsOcupadosFromEventos(
  eventos: Parameters<typeof intervalosOcupadosFromEventos>[0],
): VisitaSlotHora[] {
  return intervalosOcupadosFromEventos(eventos).map((i) => i.inicio);
}

export function inicioIndisponivel(
  inicio: string,
  ocupados: readonly AgendaIntervaloOcupado[],
): boolean {
  const opcoes = horariosFimParaInicio(inicio);
  return !opcoes.some((fim) => !intervaloTemConflito(inicio, fim, ocupados));
}

export function slotEstaOcupado(
  ocupados: readonly AgendaIntervaloOcupado[] | readonly string[],
  hora: string,
): boolean {
  if (ocupados.length === 0) return false;
  const first = ocupados[0];
  if (typeof first === "string") {
    const intervalos = (ocupados as readonly string[]).map((inicio) => ({
      inicio,
      fim: horaFimPadraoParaInicio(inicio) ?? inicio,
    }));
    return inicioIndisponivel(hora, intervalos);
  }
  return inicioIndisponivel(hora, ocupados as readonly AgendaIntervaloOcupado[]);
}

export function validarIntervaloAgenda(
  inicio: string,
  fim: string,
): { ok: true; inicio: VisitaSlotHora; fim: VisitaSlotHora } | { ok: false; message: string } {
  const inicioNorm = normalizarSlotHora(inicio);
  const fimNorm = normalizarSlotHora(fim);
  if (!inicioNorm) {
    return { ok: false, message: "Invalid start time" };
  }
  if (!fimNorm) {
    return { ok: false, message: "Invalid end time" };
  }
  if (compararHm(fimNorm, inicioNorm) <= 0) {
    return { ok: false, message: "End time must be after start time" };
  }
  const fimValido = horariosFimParaInicio(inicioNorm);
  if (!fimValido.includes(fimNorm)) {
    return {
      ok: false,
      message: "Select an end time in 30-minute steps within operating hours",
    };
  }
  return { ok: true, inicio: inicioNorm, fim: fimNorm };
}

function indicePrimeiroInicioAposHm(hm: string): number {
  const ref = normalizarSlotHora(hm);
  if (ref) {
    const idx = VISITA_SLOTS_HORARIOS.indexOf(ref);
    return idx < 0 ? VISITA_SLOTS_HORARIOS.length : idx + 1;
  }
  const idx = VISITA_SLOTS_HORARIOS.findIndex((slot) => compararHm(slot, hm) > 0);
  return idx < 0 ? VISITA_SLOTS_HORARIOS.length : idx;
}

function sugestaoPadraoNoDia(
  dataYmd: string,
  inicio: VisitaSlotHora,
): AgendaSlotSugestao | null {
  const fim = horaFimPadraoParaInicio(inicio);
  if (!fim) return null;
  return { dataYmd, hora: inicio, horaFim: fim };
}

function sugestoesNoDia(
  dataYmd: string,
  ocupados: readonly AgendaIntervaloOcupado[],
  startAt: number,
  limite: number,
): AgendaSlotSugestao[] {
  const out: AgendaSlotSugestao[] = [];
  for (
    let i = startAt;
    i < VISITA_SLOTS_HORARIOS.length && out.length < limite;
    i++
  ) {
    const inicio = VISITA_SLOTS_HORARIOS[i]!;
    if (inicioIndisponivel(inicio, ocupados)) continue;
    const sugestao = sugestaoPadraoNoDia(dataYmd, inicio);
    if (!sugestao) continue;
    if (intervaloTemConflito(sugestao.hora, sugestao.horaFim, ocupados)) continue;
    out.push(sugestao);
  }
  return out;
}

/** Próximos intervalos livres após `aposHora`. */
export function proximosSlotsDisponiveis(
  ocupados: readonly AgendaIntervaloOcupado[],
  aposHora: string,
  limite = 3,
): AgendaSlotSugestao[] {
  const startAt = indicePrimeiroInicioAposHm(aposHora);
  return sugestoesNoDia("", ocupados, startAt, limite).map((s) => ({
    ...s,
    dataYmd: s.dataYmd,
  }));
}

export function proximosSlotsDisponiveisNoDia(
  dataYmd: string,
  ocupados: readonly AgendaIntervaloOcupado[],
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

/** Horário já passou no dia operacional de hoje. */
export function horarioOperacionalJaPassou(dataVisita: string, hm: string): boolean {
  return horarioOperacionalJaPassouPara(
    dataVisita,
    hm,
    hojeOperacionalYmd(),
    horaOperacionalAgora(),
  );
}

export function horarioOperacionalJaPassouPara(
  dataVisita: string,
  hm: string,
  agoraYmd: string,
  agoraHm: string,
): boolean {
  if (dataVisita !== agoraYmd) return false;
  return compararHm(hm, agoraHm) <= 0;
}

/** Início indisponível por conflito de agenda ou horário já passado (hoje). */
export function slotInicioIndisponivelParaData(
  dataVisita: string,
  inicio: string,
  ocupados: readonly AgendaIntervaloOcupado[],
  agora?: { ymd: string; hm: string },
): boolean {
  const agoraYmd = agora?.ymd ?? hojeOperacionalYmd();
  const agoraHm = agora?.hm ?? horaOperacionalAgora();
  if (horarioOperacionalJaPassouPara(dataVisita, inicio, agoraYmd, agoraHm)) {
    return true;
  }
  return inicioIndisponivel(inicio, ocupados);
}

/** Término indisponível por conflito ou horário já passado (hoje). */
export function slotFimIndisponivelParaData(
  dataVisita: string,
  inicio: string,
  fim: string,
  ocupados: readonly AgendaIntervaloOcupado[],
  agora?: { ymd: string; hm: string },
): boolean {
  if (!inicio) return true;
  const agoraYmd = agora?.ymd ?? hojeOperacionalYmd();
  const agoraHm = agora?.hm ?? horaOperacionalAgora();
  if (horarioOperacionalJaPassouPara(dataVisita, fim, agoraYmd, agoraHm)) {
    return true;
  }
  return intervaloTemConflito(inicio, fim, ocupados);
}

/** Próximos intervalos livres a partir de agora (somente para hoje). */
export function proximosSlotsDisponiveisHoje(
  dataYmd: string,
  ocupados: readonly AgendaIntervaloOcupado[],
  limite = 3,
): AgendaSlotSugestao[] {
  const agora = horaOperacionalAgora();
  const startAt = VISITA_SLOTS_HORARIOS.findIndex((slot) => compararHm(slot, agora) >= 0);
  if (startAt < 0) return [];
  return sugestoesNoDia(dataYmd, ocupados, startAt, limite);
}

export function formatIntervaloAgenda(inicio: string, fim: string): string {
  return `${inicio} – ${fim}`;
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
