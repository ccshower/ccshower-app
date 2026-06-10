"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { OsOperationalCard } from "@/components/ordens-servico/os-operational-card";
import { OS_STATUS } from "@/lib/ordens-servico/constants";
import { tOsStatus } from "@/lib/i18n";
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
    const q = query.trim().toLowerCase();
    return rows.filter((os) => {
      if (statusFilter && os.status !== statusFilter) return false;
      if (!q) return true;
      return [
        os.titulo,
        os.cliente?.nome,
        os.cliente?.telefone,
        os.equipe?.nome,
        os.responsavel?.nome,
        tOsStatus(os.status),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [query, rows, statusFilter]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-light tracking-tight text-cc-ink">
          Work orders
        </h1>
        <p className="mt-1 text-sm font-light text-cc-muted">
          Tap a card to open the work order operational workspace.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, client, team..."
          className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((os) => (
          <OsOperationalCard
            key={os.id}
            os={os}
            onOpen={() => router.push(`/os/${os.id}`)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-ds-lg border border-dashed border-cc-border bg-cc-surface px-4 py-10 text-center text-sm text-cc-muted">
          No work orders yet. Register a client and open the work order in the same
          stage.
        </p>
      ) : null}
    </div>
  );
}
