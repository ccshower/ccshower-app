"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "ccshower-pwa-dismissed-v2";

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

/** Chrome, Firefox e browsers in-app no iOS não instalam PWA. Só o Safari. */
function isIosSafari(): boolean {
  if (!isIos()) return false;
  const ua = navigator.userAgent;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA\/|FBAN|FBAV|Instagram|WhatsApp|TikTok|Line\//i.test(ua)) {
    return false;
  }
  return /Safari/i.test(ua);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [iosSafari, setIosSafari] = useState(false);
  const [pt, setPt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkToCopy, setLinkToCopy] = useState<string | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const apple = isIos();
    setIos(apple);
    setIosSafari(isIosSafari());
    setPt(navigator.language.toLowerCase().startsWith("pt"));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (apple) {
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

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setLinkToCopy(null);
    } catch {
      setCopied(false);
      setLinkToCopy(url);
    }
  };

  if (!visible) return null;

  const title = pt ? "Instalar CCSHOWER" : "Install CCSHOWER";
  const needsSafari = ios && !iosSafari && !deferredPrompt;

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-50 border-t border-cc-border bg-cc-surface px-4 py-3 shadow-lift sm:bottom-4 sm:mx-auto sm:max-w-md sm:rounded-ds-xl sm:border md:bottom-4"
      role="dialog"
      aria-label={title}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-cc-ink">{title}</p>
          {needsSafari ? (
            <p className="mt-1 text-xs leading-relaxed text-cc-muted">
              {pt ? (
                <>
                  O iPhone só instala pelo <strong className="font-medium text-cc-ink">Safari</strong>.
                  Copie o link, abra no Safari e toque em{" "}
                  <strong className="font-medium text-cc-ink">Compartilhar</strong>, depois em{" "}
                  <strong className="font-medium text-cc-ink">Adicionar à Tela de Início</strong>.
                </>
              ) : (
                <>
                  iPhone only installs this app from{" "}
                  <strong className="font-medium text-cc-ink">Safari</strong>. Copy the link, open it
                  in Safari, then tap <strong className="font-medium text-cc-ink">Share</strong> and{" "}
                  <strong className="font-medium text-cc-ink">Add to Home Screen</strong>.
                </>
              )}
            </p>
          ) : ios && !deferredPrompt ? (
            <p className="mt-1 text-xs leading-relaxed text-cc-muted">
              {pt ? (
                <>
                  Toque em <strong className="font-medium text-cc-ink">Compartilhar</strong> (quadrado
                  com a seta) e depois em{" "}
                  <strong className="font-medium text-cc-ink">Adicionar à Tela de Início</strong>.
                </>
              ) : (
                <>
                  Tap <strong className="font-medium text-cc-ink">Share</strong> (the square with an
                  arrow), then{" "}
                  <strong className="font-medium text-cc-ink">Add to Home Screen</strong>.
                </>
              )}
            </p>
          ) : (
            <p className="mt-1 text-xs text-cc-muted">
              {pt
                ? "Acesso rápido à agenda e à operação, como um app."
                : "Quick access to the schedule and operations, like a native app."}
            </p>
          )}
          {linkToCopy ? (
            <p className="mt-2 break-all text-xs font-medium text-cc-ink">{linkToCopy}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-sm px-2 py-1 text-xs text-cc-muted hover:text-cc-ink"
          aria-label={pt ? "Fechar" : "Close"}
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        {needsSafari ? (
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex-1 rounded-sm bg-cc-ink px-3 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white"
          >
            {copied ? (pt ? "Link copiado" : "Link copied") : pt ? "Copiar link" : "Copy link"}
          </button>
        ) : null}
        {deferredPrompt ? (
          <button
            type="button"
            onClick={() => void install()}
            className="flex-1 rounded-sm bg-cc-ink px-3 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white"
          >
            {pt ? "Instalar" : "Install"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className={`rounded-sm border border-cc-border px-3 py-2.5 text-xs font-medium text-cc-muted ${
            deferredPrompt || needsSafari ? "" : "flex-1"
          }`}
        >
          {pt ? "Agora não" : "Not now"}
        </button>
      </div>
    </div>
  );
}
