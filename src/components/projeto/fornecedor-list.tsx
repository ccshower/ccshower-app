"use client";

import { useMemo, useState } from "react";

import type { Fornecedor } from "@/lib/types/database";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

type Props = {
  itens: Fornecedor[];
};

export function FornecedorList({ itens }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return itens;
    return itens.filter((item) => item.nome.toLowerCase().includes(q));
  }, [itens, query]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-light tracking-tight text-cc-ink">
          Supplier
        </h1>
        <p className="mt-1 text-sm font-light text-cc-muted">
          Registered suppliers ({itens.length}).
        </p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search supplier…"
        className={inputClass}
        aria-label="Search suppliers"
      />

      {filtered.length === 0 ? (
        <div className="rounded-ds-lg border border-cc-border bg-white px-4 py-8 text-center text-sm text-cc-muted shadow-sheet">
          {query.trim()
            ? "No suppliers found for this search."
            : "No suppliers registered."}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-ds-lg border border-cc-border bg-white shadow-sheet divide-y divide-cc-border">
          {filtered.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <span className="text-sm font-medium text-cc-ink">{item.nome}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs font-light text-cc-muted">
        Full supplier management (create/edit) is not in the UI yet —
        for now the list comes from the database.
      </p>
    </div>
  );
}
