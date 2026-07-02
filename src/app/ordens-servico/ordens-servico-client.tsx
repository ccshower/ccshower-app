"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { excluirOrdemServico } from "@/app/ordens-servico/actions";
import { OsOperationalCard } from "@/components/ordens-servico/os-operational-card";
import { OS_STATUS } from "@/lib/ordens-servico/constants";
import { t, tOsStatus } from "@/lib/i18n";
import { ordemServicoMatchesSearch } from "@/lib/ordens-servico/ordens-servico-search";
import { osWorkspacePath } from "@/lib/ordens-servico/os-routes";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

export function OrdensServicoClient({
  initial,
  canDeleteOs = false,
  dashboardHref,
}: {
  initial: OrdemServicoWithRelations[];
  canDeleteOs?: boolean;
  dashboardHref: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  const filtered = useMemo(() => {
    return rows.filter((os) => {
      if (statusFilter && os.status !== statusFilter) return false;
      return ordemServicoMatchesSearch(os, query);
    });
  }, [query, rows, statusFilter]);

  function handleDelete(os: OrdemServicoWithRelations) {
    const cliente = os.cliente?.nome?.trim() || "Customer";
    const ok = window.confirm(
      t("os.delete.confirm", { name: cliente }),
    );
    if (!ok) return;

    startTransition(async () => {
      setMsg(null);
      const r = await excluirOrdemServico(os.id);
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      setRows((prev) => prev.filter((row) => row.id !== os.id));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Link
        href={dashboardHref}
        className="inline-block text-[10px] font-medium uppercase tracking-[0.08em] text-cc-muted hover:text-cc-ink"
      >
        ← {t("os.workspace.back")}
      </Link>

      <div>
        <h1 className="font-display text-2xl font-light tracking-tight text-cc-ink">
          All work orders
        </h1>
        <p className="mt-1 text-sm font-light text-cc-muted">
          Every OS in the system — open, in progress, and completed. Search by customer
          name, phone, or address.
        </p>
      </div>

      {msg ? (
        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
          {msg}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, address, team..."
          className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
          autoComplete="off"
          inputMode="search"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus"
        >
          <option value="">All statuses</option>
          {OS_STATUS.map((s) => (
            <option key={s} value={s}>
              {tOsStatus(s)}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs font-medium uppercase tracking-[0.08em] text-cc-muted">
        {filtered.length} of {rows.length} work orders
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((os) => (
          <div key={os.id} className="flex flex-col gap-2">
            <OsOperationalCard
              os={os}
              coloredByEquipe
              onOpen={() => router.push(osWorkspacePath(os.id))}
            />
            {os.cliente?.endereco_formatado ? (
              <p className="px-1 text-xs leading-relaxed text-cc-muted">
                {os.cliente.endereco_formatado}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3 px-1">
              <Link
                href={osWorkspacePath(os.id)}
                className="text-xs font-medium text-cc-blue hover:underline"
              >
                Open work order →
              </Link>
              {canDeleteOs ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleDelete(os)}
                  className="text-xs font-medium text-cc-red transition hover:text-cc-rose-deep disabled:opacity-50"
                >
                  {t("os.delete.action")}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-ds-lg border border-dashed border-cc-border bg-cc-surface px-4 py-10 text-center text-sm text-cc-muted">
          {rows.length === 0
            ? "No work orders registered yet."
            : "No work orders match your search."}
        </p>
      ) : null}
    </div>
  );
}
