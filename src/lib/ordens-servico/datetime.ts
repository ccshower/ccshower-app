import { DISPLAY_LOCALE, t } from "@/lib/i18n";

/** CCSHOWER operational timezone (Florida). */
export const OPERATIONAL_TZ = "America/New_York";
const DATE_YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_HM = /^(\d{1,2}):(\d{2})$/;

function parseYmd(ymd: string) {
  const m = ymd.trim().match(DATE_YMD);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

function parseHm(hm: string) {
  const m = hm.trim().match(TIME_HM);
  if (!m) return null;
  return { h: Number(m[1]), mi: Number(m[2]) };
}

/**
 * Converte data/hora “de parede” no fuso operacional para instante UTC (ISO).
 * Evita offset fixo (-05:00) e conversões duplas do browser.
 */
export function zonedWallClockToUtcIso(
  dateYmd: string,
  timeHm: string,
  timeZone: string = OPERATIONAL_TZ,
): string | null {
  const ymd = parseYmd(dateYmd);
  const hm = parseHm(timeHm);
  if (!ymd || !hm) return null;
  if (hm.h > 23 || hm.mi > 59) return null;

  const { y, mo, d } = ymd;
  const { h, mi } = hm;

  let utcMs = Date.UTC(y, mo - 1, d, h, mi, 0);

  for (let i = 0; i < 4; i++) {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(new Date(utcMs));
    const gotY = Number(parts.find((p) => p.type === "year")?.value);
    const gotMo = Number(parts.find((p) => p.type === "month")?.value);
    const gotD = Number(parts.find((p) => p.type === "day")?.value);
    const gotH = Number(parts.find((p) => p.type === "hour")?.value);
    const gotMi = Number(parts.find((p) => p.type === "minute")?.value);

    const wantMs = Date.UTC(y, mo - 1, d, h, mi, 0);
    const gotMs = Date.UTC(gotY, gotMo - 1, gotD, gotH, gotMi, 0);
    utcMs += wantMs - gotMs;
  }

  return new Date(utcMs).toISOString();
}

/** Combina data + hora no fuso operacional → UTC ISO para o banco. */
export function buildDataEventoIso(
  dataVisita: string,
  horaVisita: string,
): string | null {
  return zonedWallClockToUtcIso(dataVisita, horaVisita);
}

export function defaultVisitaDateTime(): { data: string; hora: string } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const data = tomorrow.toLocaleDateString("en-CA", { timeZone: OPERATIONAL_TZ });
  return { data, hora: "09:00" };
}

/** Extrai data/hora da visita no fuso operacional. */
export function parseVisitaDateTime(iso: string | undefined | null): {
  data: string;
  hora: string;
} {
  if (!iso) return defaultVisitaDateTime();

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return defaultVisitaDateTime();

  const data = d.toLocaleDateString("en-CA", { timeZone: OPERATIONAL_TZ });
  const hora = d.toLocaleTimeString("en-GB", {
    timeZone: OPERATIONAL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return { data, hora };
}

const VISITA_NAO_AGENDADA = () => t("os.timeline.visitNotScheduled");

/** Card operação / resumo — ex.: "Wed, May 28, 8:00 AM". */
export function formatOperacionalVisita(iso: string | undefined | null): string {
  if (!iso) return VISITA_NAO_AGENDADA();

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return VISITA_NAO_AGENDADA();

  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: OPERATIONAL_TZ,
  }).format(d);
}

/** Card comercial — ex.: "Fri, May 29 • 9:00 AM". */
export function formatOperacionalVisitaCard(iso: string | undefined | null): string {
  if (!iso) return VISITA_NAO_AGENDADA();

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return VISITA_NAO_AGENDADA();

  const datePart = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: OPERATIONAL_TZ,
  }).format(d);

  const timePart = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: OPERATIONAL_TZ,
  }).format(d);

  return `${datePart} • ${timePart}`;
}

/** Data/hora da timeline operacional — ex.: "28/05/2026 • 08:00 AM". */
export function formatTimelineDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const datePart = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: OPERATIONAL_TZ,
  }).format(d);

  const timePart = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: OPERATIONAL_TZ,
  }).format(d);

  return `${datePart} • ${timePart}`;
}

/** Data/hora média (workspace, detalhes). */
export function formatOperacionalDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
    timeZone: OPERATIONAL_TZ,
  }).format(d);
}

export function isoRangeDiaOperacional(dataVisita: string): {
  start: string;
  end: string;
} | null {
  if (!DATE_YMD.test(dataVisita)) return null;
  const start = zonedWallClockToUtcIso(dataVisita, "00:00");
  const endLate = zonedWallClockToUtcIso(dataVisita, "23:59");
  if (!start || !endLate) return null;

  const endMs = new Date(endLate).getTime() + 59_999;
  return {
    start,
    end: new Date(endMs).toISOString(),
  };
}
