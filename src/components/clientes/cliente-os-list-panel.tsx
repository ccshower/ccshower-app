"use client";

import { OsOperacionalBadge } from "@/components/ordens-servico/os-operacional-badge";
import { DISPLAY_LOCALE } from "@/lib/i18n";
import { isOsAberta } from "@/lib/ordens-servico/open-status";
import { tituloOperacionalCard } from "@/lib/ordens-servico/os-operational-title";
import type { ClienteOsResumo } from "@/lib/types/database";

function formatUpdated(iso: string) {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(iso));
}

type Props = {
  clienteNome: string;
  ordens: ClienteOsResumo[];
  onSelect: (osId: string) => void;
  onNova?: () => void;
};

export function ClienteOsListPanel({
  clienteNome,
  ordens,
  onSelect,
  onNova,
}: Props) {
  const sorted = [...ordens].sort((a, b) => {
    const aOpen = isOsAberta(a.status) ? 0 : 1;
    const bOpen = isOsAberta(b.status) ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return b.atualizado_em.localeCompare(a.atualizado_em);
  });

  return (
    <div className="space-y-3">
      <p className="text-sm font-light leading-relaxed text-cc-deep">
        <span className="font-medium text-cc-ink">{clienteNome}</span> possui várias OS
        abertas. Selecione uma para abrir o painel operacional ou crie uma nova.
      </p>

      <ul className="space-y-2">
        {sorted.map((os) => (
          <li key={os.id}>
            <button
              type="button"
              onClick={() => onSelect(os.id)}
              className="flex w-full items-center gap-3 rounded-ds-lg border border-cc-border bg-white px-3 py-3 text-left shadow-sheet transition hover:border-cc-blue-soft hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-cc-blue-focus"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-cc-ink">
                  {tituloOperacionalCard({
                    etapa_atual: os.etapa_atual,
                    status: os.status,
                    clienteNome,
                  })}
                </p>
                <p className="mt-0.5 text-xs text-cc-muted">
                  {formatUpdated(os.atualizado_em)}
                </p>
                {os.equipe_atual ? (
                  <p className="mt-1 text-xs text-cc-deep">{os.equipe_atual.nome}</p>
                ) : null}
              </div>
              <OsOperacionalBadge
                equipeAtual={os.equipe_atual}
                etapaAtual={os.etapa_atual}
                statusAtual={os.status_atual}
                compact
              />
            </button>
          </li>
        ))}
      </ul>

      {onNova ? (
        <div className="border-t border-cc-border-light pt-3">
          <button
            type="button"
            onClick={onNova}
            className="w-full rounded-sm border border-dashed border-cc-border-strong px-3 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-cc-blue transition hover:border-cc-blue hover:bg-cc-blue-soft"
          >
            New work order
          </button>
        </div>
      ) : null}
    </div>
  );
}
