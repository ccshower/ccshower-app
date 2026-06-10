"use client";

import { t } from "@/lib/i18n";
import { isOsFluxoBloqueado } from "@/lib/ordens-servico/os-bloqueio-fluxo";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

export function osTemBloqueioAtivoListagem(os: OrdemServicoWithRelations): boolean {
  return os.tem_bloqueio_ativo === true || isOsFluxoBloqueado(os);
}

/** Indicador na listagem de OS com bloqueio ativo. */
export function OsBloqueioListBadge({ compact }: { compact?: boolean }) {
  return (
    <span
      className={
        compact
          ? "shrink-0 rounded-sm border border-amber-400/90 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950 shadow-sm ring-1 ring-amber-500/25"
          : "inline-flex rounded-sm border border-amber-400/90 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-950 shadow-sm ring-1 ring-amber-500/25"
      }
    >
      {t("os.bloqueio.listBadge")}
    </span>
  );
}
