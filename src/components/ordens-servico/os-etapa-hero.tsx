"use client";

import { OsOperacionalBadge } from "@/components/ordens-servico/os-operacional-badge";
import { t, tOsStage } from "@/lib/i18n";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
};

/** Destaque da etapa atual — hierarquia visual do painel operacional. */
export function OsEtapaHero({ ordem }: Props) {
  const etapa = parseOsStage(ordem.etapa_atual);

  return (
    <header className="rounded-ds-lg border border-cc-ink/10 bg-cc-ink px-4 py-4 text-white shadow-sheet">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
        {t("os.panel.currentStage")}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-light tracking-tight">
          {tOsStage(etapa)}
        </h2>
        <OsOperacionalBadge
          equipeAtual={ordem.equipe}
          etapaAtual={ordem.etapa_atual}
          statusAtual={ordem.status_atual}
          className="!border-white/25 !bg-white/10 !text-white"
        />
      </div>
      <p className="mt-2 truncate text-sm font-light text-white/80">
        {ordem.titulo}
      </p>
    </header>
  );
}
