"use client";

import { useState, useTransition } from "react";

import { resolverBloqueioOperacional } from "@/app/ordens-servico/bloqueio-operacional-actions";
import { OsBloqueioFluxoAviso } from "@/components/ordens-servico/os-bloqueio-fluxo-aviso";
import { t, tOsStage, DISPLAY_LOCALE } from "@/lib/i18n";
import { BLOQUEIO_STATUS_ATIVO } from "@/lib/ordens-servico/bloqueio-operacional";
import { isOsFluxoBloqueado } from "@/lib/ordens-servico/os-bloqueio-fluxo";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
  onAtualizado: () => void;
};

function formatBloqueioData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(d);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-amber-200/60 py-2 last:border-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-900/70">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-light text-amber-950">{value}</dd>
    </div>
  );
}

/** Banner no topo da tela da OS quando há bloqueio operacional ativo. */
export function OsBloqueioOperacionalBanner({ ordem, onAtualizado }: Props) {
  const bloqueio = ordem.bloqueio_ativo ?? null;
  const bloqueioAtivo =
    isOsFluxoBloqueado(ordem) || bloqueio?.status === BLOQUEIO_STATUS_ATIVO;

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!bloqueioAtivo || !bloqueio) return null;

  const crash = bloqueio;
  const bloqueioId = crash.id;

  function submitResolver() {
    if (crash.status !== BLOQUEIO_STATUS_ATIVO) return;
    if (!window.confirm(t("os.bloqueio.confirmResolve"))) return;

    startTransition(async () => {
      setError(null);
      const result = await resolverBloqueioOperacional(ordem.id, bloqueioId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onAtualizado();
    });
  }

  return (
    <section
      className="rounded-ds-lg border-2 border-amber-300/90 bg-amber-50/95 px-4 py-3 shadow-sheet"
      aria-label={t("os.bloqueio.activeTitle")}
    >
      <h2 className="text-sm font-semibold text-amber-950">
        {t("os.bloqueio.activeTitle")}
      </h2>

      <div className="mt-3 rounded-sm border border-amber-200/80 bg-white/60 px-3 py-2">
        <dl>
          <DetailRow
            label={t("os.bloqueio.fieldStage")}
            value={tOsStage(parseOsStage(crash.etapa))}
          />
          <DetailRow label={t("os.bloqueio.fieldCategory")} value={crash.categoria} />
          <DetailRow label={t("os.bloqueio.fieldReason")} value={crash.motivo} />
          {crash.observacao ? (
            <DetailRow label={t("os.bloqueio.fieldNotes")} value={crash.observacao} />
          ) : null}
          <DetailRow
            label={t("os.bloqueio.fieldCreatedAt")}
            value={formatBloqueioData(crash.criado_em)}
          />
        </dl>
      </div>

      {error ? (
        <p className="mt-2 rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pending || crash.status !== BLOQUEIO_STATUS_ATIVO}
        onClick={submitResolver}
        className="mt-3 w-full rounded-sm border border-amber-400/80 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-950 hover:bg-amber-100/80 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {pending ? t("os.bloqueio.resolving") : t("os.bloqueio.resolve")}
      </button>

      <div className="mt-3">
        <OsBloqueioFluxoAviso />
      </div>
    </section>
  );
}
