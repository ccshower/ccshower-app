"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { CalendarEquipeFilterSelect } from "@/components/calendar/calendar-equipe-filter-select";
import { OsOperationalCard } from "@/components/ordens-servico/os-operational-card";
import {
  operacaoHref,
  type CalendarEquipeOption,
} from "@/lib/calendar/calendar-equipe-filter";
import { t } from "@/lib/i18n";
import { tituloOperacionalCard } from "@/lib/ordens-servico/os-operational-title";
import { ordensServicoListPath } from "@/lib/ordens-servico/os-routes";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  initial: OrdemServicoWithRelations[];
  equipes: CalendarEquipeOption[];
  selectedEquipeId: string | null;
  canFilterEquipes: boolean;
  viewerCanSeeFinancial?: boolean;
};

export function OperacaoClient({
  initial,
  equipes,
  selectedEquipeId,
  canFilterEquipes,
  viewerCanSeeFinancial = false,
}: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => setRows(initial), [initial]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((os) =>
      [
        tituloOperacionalCard({
          etapa_atual: os.etapa_atual,
          status: os.status,
          clienteNome: os.cliente?.nome ?? "Client",
        }),
        os.titulo,
        os.cliente?.nome,
        os.cliente?.telefone,
        os.equipe?.nome,
        os.etapa_atual,
        os.status_atual,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [query, rows]);

  function onEquipeChange(nextEquipeId: string) {
    router.push(
      operacaoHref({
        equipe: nextEquipeId || null,
      }),
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-light tracking-tight text-cc-ink">
            Operations
          </h1>
          <p className="mt-1 text-sm font-light text-cc-muted">
            Daily operational flow — tap a card to work the OS.
          </p>
          <Link
            href={ordensServicoListPath()}
            className="mt-3 inline-flex min-h-[2.75rem] items-center rounded-sm border border-cc-border bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep transition hover:border-cc-blue-soft hover:bg-cc-canvas"
          >
            All work orders
          </Link>
        </div>
        {canFilterEquipes && equipes.length > 0 ? (
          <label className="flex min-w-[10rem] flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
              {t("calendar.filterTeam")}
            </span>
            <CalendarEquipeFilterSelect
              equipes={equipes}
              selectedEquipeId={selectedEquipeId}
              onChange={onEquipeChange}
            />
          </label>
        ) : null}
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search OS, client, team..."
        className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((os) => (
          <OsOperationalCard
            key={os.id}
            os={os}
            coloredByEquipe
            viewerCanSeeFinancial={viewerCanSeeFinancial}
            onOpen={() =>
              startTransition(() => {
                router.push(`/os/${os.id}`);
              })
            }
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-ds-lg border border-dashed border-cc-border bg-cc-surface px-4 py-10 text-center text-sm text-cc-muted">
          No OS in operations.
        </p>
      ) : null}
    </div>
  );
}
