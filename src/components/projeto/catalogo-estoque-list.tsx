"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { CatalogoItem } from "@/lib/types/database";
import { formatCatalogoQuantity } from "@/lib/ordens-servico/catalogo-quantidade";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

type Props = {
  itens: CatalogoItem[];
  embedded?: boolean;
  onNovo?: () => void;
};

function groupByCategory(itens: CatalogoItem[]) {
  const map = new Map<string, CatalogoItem[]>();
  for (const item of itens) {
    const cat = item.categoria.trim() || "Other";
    const list = map.get(cat) ?? [];
    list.push(item);
    map.set(cat, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "en-US"));
}

export function CatalogoEstoqueList({ itens, embedded = false, onNovo }: Props) {
  const [query, setQuery] = useState("");

  const grupos = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? itens.filter(
          (item) =>
            item.nome.toLowerCase().includes(q) ||
            item.categoria.toLowerCase().includes(q) ||
            item.unidade.toLowerCase().includes(q),
        )
      : itens;
    return groupByCategory(filtered);
  }, [itens, query]);

  const total = useMemo(
    () => grupos.reduce((acc, [, lista]) => acc + lista.length, 0),
    [grupos],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {!embedded ? (
          <div>
            <h1 className="font-display text-2xl font-light tracking-tight text-cc-ink">
              Inventory
            </h1>
            <p className="mt-1 text-sm font-light text-cc-muted">
              Registered product catalog ({itens.length} items).
            </p>
          </div>
        ) : (
          <p className="text-sm font-light text-cc-muted">
            {itens.length} item(s) registered.
          </p>
        )}
        {embedded && onNovo ? (
          <button
            type="button"
            onClick={onNovo}
            className="inline-flex items-center justify-center rounded-sm bg-cc-ink px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet transition hover:bg-cc-deep"
          >
            New item
          </button>
        ) : (
          <Link
            href="/estoque/novo"
            className="inline-flex items-center justify-center rounded-sm bg-cc-ink px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet transition hover:bg-cc-deep"
          >
            New item
          </Link>
        )}
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search product, category, or unit…"
        className={inputClass}
        aria-label="Search products"
      />

      {total === 0 ? (
        <div className="rounded-ds-lg border border-cc-border bg-white px-4 py-8 text-center text-sm text-cc-muted shadow-sheet">
          {query.trim()
            ? "No products found for this search."
            : "No products registered in the catalog."}
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map(([categoria, lista]) => (
            <section
              key={categoria}
              className="overflow-hidden rounded-ds-lg border border-cc-border bg-white shadow-sheet"
            >
              <header className="border-b border-cc-border bg-cc-canvas px-4 py-2.5">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted">
                  {categoria}
                </h2>
              </header>
              <ul className="divide-y divide-cc-border">
                {lista.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="min-w-0 text-sm font-medium text-cc-ink">
                      {item.nome}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold tabular-nums tracking-[0.04em] text-violet-800">
                        {formatCatalogoQuantity(item.quantidade ?? 0)}
                      </span>
                      <span className="rounded-full border border-cc-border bg-cc-canvas px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
                        {item.unidade}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
