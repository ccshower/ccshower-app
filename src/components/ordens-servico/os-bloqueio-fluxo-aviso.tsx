"use client";

import { t } from "@/lib/i18n";

/** Aviso exibido quando há bloqueio ativo impedindo avanço do fluxo. */
export function OsBloqueioFluxoAviso() {
  return (
    <div
      className="rounded-sm border border-amber-300/80 bg-amber-50 px-3 py-2.5"
      role="status"
    >
      <p className="text-sm font-medium text-amber-950">
        {t("os.bloqueio.fluxoBlocked")}
      </p>
      <p className="mt-1 text-sm font-light text-amber-900/90">
        {t("os.bloqueio.fluxoBlockedHint")}
      </p>
    </div>
  );
}
