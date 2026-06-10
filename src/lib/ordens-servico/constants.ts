import {
  LEGACY_EVENT_STATUS,
  LEGACY_EVENT_TYPE,
  LEGACY_OS_STATUS,
  normalizeLegacyKey,
} from "@/lib/operational/legacy-keys";

export const OS_STATUS = [
  "open",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type OrdemServicoStatus = (typeof OS_STATUS)[number];

export function parseOrdemServicoStatus(
  raw: string | null | undefined,
): OrdemServicoStatus | null {
  const v = normalizeLegacyKey(raw, LEGACY_OS_STATUS, OS_STATUS, "");
  return v ? (v as OrdemServicoStatus) : null;
}

export const EVENT_TYPES = [
  "technical_visit",
  "measurement",
  "installation",
  "stage_changed",
  "status_changed",
  "os_created",
  "other",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export function parseEventType(raw: string | null | undefined): EventType | null {
  const v = normalizeLegacyKey(raw, LEGACY_EVENT_TYPE, EVENT_TYPES, "");
  return v ? (v as EventType) : null;
}

export const EVENT_STATUS = [
  "scheduled",
  "confirmed",
  "on_site",
  "completed",
  "cancelled",
] as const;

export type EventStatus = (typeof EVENT_STATUS)[number];

export function parseEventStatus(
  raw: string | null | undefined,
): EventStatus | null {
  const v = normalizeLegacyKey(raw, LEGACY_EVENT_STATUS, EVENT_STATUS, "");
  return v ? (v as EventStatus) : null;
}

export const OS_STATUS_STYLE: Record<
  OrdemServicoStatus,
  { bg: string; text: string }
> = {
  open: { bg: "bg-cc-border-light", text: "text-cc-deep" },
  scheduled: { bg: "bg-cc-blue-soft", text: "text-cc-blue-deep" },
  in_progress: { bg: "bg-cc-rose-soft", text: "text-cc-rose-deep" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-800" },
  cancelled: { bg: "bg-cc-border-light", text: "text-cc-muted" },
};
