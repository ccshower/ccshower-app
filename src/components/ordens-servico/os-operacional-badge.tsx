"use client";



import {

  labelOperationalStatus,

  parseOsStage,

} from "@/lib/ordens-servico/operacional-snapshot";

import { tOsStage } from "@/lib/i18n";

import { equipeBadgeStyles } from "@/lib/ui/equipe-color";



type EquipeCor = {

  nome: string;

  cor_primaria: string;

};



type Props = {

  equipeAtual: EquipeCor | null;

  etapaAtual: string;

  statusAtual: string;

  compact?: boolean;

  className?: string;

};



export function OsOperacionalBadge({

  equipeAtual,

  etapaAtual,

  statusAtual,

  compact = false,

  className = "",

}: Props) {

  const label = labelOperationalStatus(statusAtual);

  const etapa = tOsStage(parseOsStage(etapaAtual));

  const cor = equipeAtual?.cor_primaria ?? "#6b7898";

  const styles = equipeBadgeStyles(cor);



  return (

    <span

      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium leading-tight ${compact ? "text-[10px]" : "text-[11px]"} ${className}`}

      style={styles}

      title={

        equipeAtual

          ? `${equipeAtual.nome} · ${etapa} · ${label}`

          : `${etapa} · ${label}`

      }

    >

      <span

        className="h-2 w-2 shrink-0 rounded-full"

        style={{ backgroundColor: cor }}

        aria-hidden

      />

      <span className="truncate">{label}</span>

    </span>

  );

}


