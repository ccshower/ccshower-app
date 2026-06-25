"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "ccshower-pwa-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    setIos(isIos());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIos()) {
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      localStorage.setItem(DISMISS_KEY, "1");
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-50 border-t border-cc-border bg-cc-surface px-4 py-3 shadow-lift sm:bottom-4 sm:mx-auto sm:max-w-md sm:rounded-ds-xl sm:border md:bottom-4"
      role="dialog"
      aria-label="Install app"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-cc-ink">Install CCSHOWER</p>
          {ios && !deferredPrompt ? (
            <p className="mt-1 text-xs leading-relaxed text-cc-muted">
              Tap <strong className="font-medium text-cc-ink">Share</strong> and then{" "}
              <strong className="font-medium text-cc-ink">Add to Home Screen</strong>.
            </p>
          ) : (
            <p className="mt-1 text-xs text-cc-muted">
              Quick access to the schedule and operations, like a native app.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-sm px-2 py-1 text-xs text-cc-muted hover:text-cc-ink"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        {deferredPrompt ? (
          <button
            type="button"
            onClick={() => void install()}
            className="flex-1 rounded-sm bg-cc-ink px-3 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white"
          >
            Install
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className={`rounded-sm border border-cc-border px-3 py-2.5 text-xs font-medium text-cc-muted ${
            deferredPrompt ? "" : "flex-1"
          }`}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
