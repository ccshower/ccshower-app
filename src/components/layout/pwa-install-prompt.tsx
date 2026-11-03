"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "ccshower-pwa-dismissed-v3";

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
          {ios && !deferredPrompt ? (
            <div className="mt-1 text-xs leading-relaxed text-cc-muted">
              {needsSafari ? (
                <p>
                  {pt ? (
                    <>
                      Abra esta página no <strong className="font-medium text-cc-ink">Safari</strong>.
                      O Chrome do iPhone não instala.
                    </>
                  ) : (
                    <>
                      Open this page in <strong className="font-medium text-cc-ink">Safari</strong>.
                      iPhone Chrome cannot install it.
                    </>
                  )}
                </p>
              ) : null}
              <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                {(pt
                  ? [
                      "Toque em Compartilhar, o quadrado com a seta na barra de baixo.",
                      "Role a lista e toque em Adicionar à Tela de Início.",
                      "Deixe Abrir como App da Web ligado e toque em Adicionar.",
                    ]
                  : [
                      "Tap Share, the square with an arrow in the bottom bar.",
                      "Scroll the list and tap Add to Home Screen.",
                      "Leave Open as Web App on, then tap Add.",
                    ]
                ).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="mt-1">
                {pt
                  ? "Se Adicionar à Tela de Início não aparecer, role até o fim, toque em Editar Ações e ative essa opção."
                  : "If Add to Home Screen is not there, scroll to the bottom, tap Edit Actions, and turn it on."}
              </p>
            </div>
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
