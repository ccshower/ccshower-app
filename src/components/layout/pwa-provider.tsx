"use client";

import { PwaInstallPrompt } from "@/components/layout/pwa-install-prompt";
import { useEffect } from "react";

function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
}

export function PwaProvider() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <PwaInstallPrompt />;
}
