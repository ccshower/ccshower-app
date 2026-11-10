"use client";

import { useState } from "react";

import { t } from "@/lib/i18n";
import { stageTriggersClientEtaSms } from "@/lib/ordens-servico/open-route-policy";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";

type Props = {
  ordemId: string;
  etapaAtual: string | null;
  fallbackMapsUrl: string | null;
};

type OpenRouteResponse = {
  ok?: boolean;
  mapsUrl?: string | null;
  smsQueued?: boolean;
  message?: string;
};

type RouteOrigin = {
  originLat: number;
  originLng: number;
  capturedAt: string;
};

type BusyAction = "open" | "notify" | null;

function getCurrentPosition(): Promise<RouteOrigin> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          originLat: position.coords.latitude,
          originLng: position.coords.longitude,
          capturedAt: new Date(position.timestamp).toISOString(),
        });
      },
      reject,
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

function noticeFailureMessage(message: string | undefined): string {
  if (message === "Customer phone missing") {
    return t("os.workspace.sendNoticePhoneMissing");
  }
  if (message === "Customer phone invalid") {
    return t("os.workspace.sendNoticePhoneInvalid");
  }
  if (message === "Customer has not authorized SMS") {
    return t("os.workspace.sendNoticeSmsNotAuthorized");
  }
  if (message === "Customer notification was recently queued") {
    return t("os.workspace.sendNoticeSmsRecent");
  }
  return t("os.workspace.sendNoticeFailed");
}

export function OsOpenRouteButton({
  ordemId,
  etapaAtual,
  fallbackMapsUrl,
}: Props) {
  const [busy, setBusy] = useState<BusyAction>(null);
  const [message, setMessage] = useState<string | null>(null);
  const etapa = parseOsStage(etapaAtual);
  const canNotify = stageTriggersClientEtaSms(etapa);

  if (!canNotify) {
    return fallbackMapsUrl ? (
      <a
        href={fallbackMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-sm border border-cc-border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
      >
        {t("os.workspace.openRoute")}
      </a>
    ) : (
      <span
        className="rounded-sm border border-dashed border-cc-border px-2.5 py-1.5 text-[10px] text-cc-subtle"
        title={t("os.visit.noMaps")}
      >
        {t("os.workspace.openRoute")}
      </span>
    );
  }

  async function requestRoute(notify: boolean): Promise<{
    gpsDenied: boolean;
    result: OpenRouteResponse;
  }> {
    let origin: Partial<RouteOrigin> = {};
    let gpsDenied = false;

    try {
      origin = await getCurrentPosition();
    } catch {
      gpsDenied = true;
    }

    const response = await fetch(`/api/os/${ordemId}/open-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...origin, notify }),
    });
    const result = (await response.json().catch(() => ({}))) as OpenRouteResponse;

    if (!response.ok || !result.ok) {
      throw new Error(result.message);
    }

    return { gpsDenied, result };
  }

  async function handleOpenRoute() {
    setBusy("open");
    setMessage(null);

    try {
      const { gpsDenied, result } = await requestRoute(false);
      const mapsUrl = result.mapsUrl ?? fallbackMapsUrl;
      if (!mapsUrl) {
        setMessage(t("os.workspace.openRouteUnavailable"));
        return;
      }

      if (gpsDenied) {
        setMessage(t("os.workspace.openRouteGpsDenied"));
      }

      window.open(mapsUrl, "_blank", "noopener,noreferrer");
    } catch {
      setMessage(t("os.workspace.openRouteError"));
    } finally {
      setBusy(null);
    }
  }

  async function handleSendNotice() {
    if (!confirm(t("os.workspace.sendNoticeConfirm"))) return;

    setBusy("notify");
    setMessage(null);

    try {
      const { gpsDenied, result } = await requestRoute(true);
      if (result.smsQueued) {
        setMessage(
          gpsDenied
            ? t("os.workspace.sendNoticeSentWithoutGps")
            : t("os.workspace.sendNoticeSent"),
        );
        return;
      }

      setMessage(noticeFailureMessage(result.message));
    } catch {
      setMessage(t("os.workspace.sendNoticeError"));
    } finally {
      setBusy(null);
    }
  }

  const isBusy = busy != null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={handleOpenRoute}
          disabled={isBusy}
          className="rounded-sm border border-cc-border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light disabled:cursor-wait disabled:opacity-60"
        >
          {busy === "open"
            ? t("os.workspace.openRouteLoading")
            : t("os.workspace.openRoute")}
        </button>
        <button
          type="button"
          onClick={handleSendNotice}
          disabled={isBusy}
          className="rounded-sm border border-cc-blue/40 bg-cc-blue-soft px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-blue-deep hover:bg-cc-blue/15 disabled:cursor-wait disabled:opacity-60"
        >
          {busy === "notify"
            ? t("os.workspace.sendNoticeLoading")
            : t("os.workspace.sendNotice")}
        </button>
      </div>
      {message ? (
        <p className="max-w-56 text-right text-[10px] text-cc-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
