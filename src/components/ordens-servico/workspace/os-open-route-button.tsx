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
  message?: string;
};

type RouteOrigin = {
  originLat: number;
  originLng: number;
  capturedAt: string;
};

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

export function OsOpenRouteButton({
  ordemId,
  etapaAtual,
  fallbackMapsUrl,
}: Props) {
  const [isOpening, setIsOpening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const etapa = parseOsStage(etapaAtual);

  if (!stageTriggersClientEtaSms(etapa)) {
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

  async function handleOpenRoute() {
    setIsOpening(true);
    setMessage(null);

    let origin: Partial<RouteOrigin> = {};

    try {
      origin = await getCurrentPosition();
    } catch {
      setMessage(t("os.workspace.openRouteGpsDenied"));
    }

    try {
      const response = await fetch(`/api/os/${ordemId}/open-route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(origin),
      });
      const result = (await response.json().catch(() => ({}))) as OpenRouteResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.message);
      }

      setMessage(null);
      const mapsUrl = result.mapsUrl ?? fallbackMapsUrl;
      if (!mapsUrl) {
        setMessage(t("os.workspace.openRouteUnavailable"));
        return;
      }

      if (result.message === "Customer phone missing") {
        setMessage(t("os.workspace.openRoutePhoneMissing"));
      }

      window.open(mapsUrl, "_blank", "noopener,noreferrer");
    } catch {
      setMessage(t("os.workspace.openRouteError"));
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleOpenRoute}
        disabled={isOpening}
        className="rounded-sm border border-cc-border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light disabled:cursor-wait disabled:opacity-60"
      >
        {isOpening
          ? t("os.workspace.openRouteLoading")
          : t("os.workspace.openRoute")}
      </button>
      {message ? (
        <p className="max-w-40 text-right text-[10px] text-cc-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
