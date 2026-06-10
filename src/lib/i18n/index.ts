import { enUS, type EnUSDictionary } from "@/lib/i18n/locales/en-US";
import { ptBR, type PtBRDictionary } from "@/lib/i18n/locales/pt-BR";

export type Locale = "en-US" | "pt-BR";

export type Dictionary = EnUSDictionary;

/** Locale for Intl date/number formatting in the UI. */
export const DISPLAY_LOCALE = "en-US" as const;

const dictionaries: Record<Locale, EnUSDictionary | PtBRDictionary> = {
  "en-US": enUS,
  "pt-BR": ptBR,
};

let currentLocale: Locale = "en-US";

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

function resolve(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Translate i18n key (e.g. `os.stage.commercial`). Fallback: last path segment. */
export function t(
  path: string,
  params?: Record<string, string>,
  locale: Locale = currentLocale,
): string {
  const dict = dictionaries[locale];
  let text = resolve(dict, path) ?? path.split(".").pop() ?? path;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

export function tClientType(type: string): string {
  return t(`client.type.${type}`);
}

export function tOsStage(stage: string): string {
  return t(`os.stage.${stage}`);
}

export function tOsStatus(status: string): string {
  return t(`os.status.${status}`);
}

export function tOsOperationalStatus(code: string): string {
  return t(`os.operationalStatus.${code}`);
}

export function tEventType(type: string): string {
  return t(`event.type.${type}`);
}

export function tEventStatus(status: string): string {
  return t(`event.status.${status}`);
}

/** Neutral audit description: `commercial → financial_review` */
export function formatStageTransition(
  from: string,
  to: string,
  opts?: { translate?: boolean },
): string {
  if (opts?.translate) {
    return `${tOsStage(from)} → ${tOsStage(to)}`;
  }
  return `${from} → ${to}`;
}

export function formatStatusTransition(from: string, to: string): string {
  return `${from} → ${to}`;
}

/** Translate persisted description with arrows between keys. */
export function translateTransitionDescription(desc: string | null): string {
  if (!desc?.trim()) return "";
  const trimmed = desc.trim();
  if (!trimmed.includes("→")) return trimmed;

  const [left, right] = trimmed.split("→").map((s) => s.trim());
  const tl = tOsStage(left);
  const tr = tOsStage(right);
  if (tl !== left || tr !== right) {
    return `${tl} → ${tr}`;
  }
  const sl = tOsStatus(left);
  const sr = tOsStatus(right);
  if (sl !== left || sr !== right) {
    return `${sl} → ${sr}`;
  }
  return trimmed;
}
