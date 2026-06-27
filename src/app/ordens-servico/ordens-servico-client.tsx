"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { OsOperationalCard } from "@/components/ordens-servico/os-operational-card";
import { OS_STATUS } from "@/lib/ordens-servico/constants";
import { tOsStatus } from "@/lib/i18n";
import { ordemServicoMatchesSearch } from "@/lib/ordens-servico/ordens-servico-search";
import { osWorkspacePath } from "@/lib/ordens-servico/os-routes";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

export function OrdensServicoClient({
  initial,
}: {
  initial: OrdemServicoWithRelations[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  const filtered = useMemo(() => {
    return rows.filter((os) => {
      if (statusFilter && os.status !== statusFilter) return false;
      return ordemServicoMatchesSearch(os, query);
    });
  }, [query, rows, statusFilter]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-light tracking-tight text-cc-ink">
          All work orders
        </h1>
        <p className="mt-1 text-sm font-light text-cc-muted">
          Every OS in the system — open, in progress, and completed. Search by customer
          name, phone, or address.
        </p>
      </div>

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
            <Link
              href={osWorkspacePath(os.id)}
              className="px-1 text-xs font-medium text-cc-blue hover:underline"
            >
              Open work order →
            </Link>
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
