import { DISPLAY_LOCALE } from "@/lib/i18n";
import { OPERATIONAL_TZ } from "@/lib/ordens-servico/datetime";

/** Compact date for headers — e.g. Wed, Jun 08, 2026 */
export function formatCentroHeaderDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: OPERATIONAL_TZ,
  }).formatToParts(now);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const weekday = pick("weekday").replace(/\.$/, "");
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const day = pick("day");
  const month = pick("month").replace(/\.$/, "");
  const monthCap = month.charAt(0).toUpperCase() + month.slice(1, 3);
  const year = pick("year");

  return `${weekdayCap}, ${day} ${monthCap} ${year}`;
}
