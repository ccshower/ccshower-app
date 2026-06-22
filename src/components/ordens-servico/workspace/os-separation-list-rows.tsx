"use client";

import { t } from "@/lib/i18n";
import type { OsSeparationListItem } from "@/lib/types/database";

type RowItem = Pick<OsSeparationListItem, "item_id" | "quantity"> & {
  _key: string;
  notes?: string | null;
  catalogo_item?: OsSeparationListItem["catalogo_item"];
};

type Props = {
  itens: RowItem[];
  onRemover?: (key: string) => void;
  disabled?: boolean;
};

function labelItem(item: RowItem): string {
  return item.catalogo_item?.nome ?? "—";
}

function labelDetail(item: RowItem): string | null {
  return item.notes?.trim() || null;
}

function labelUnit(item: RowItem): string {
  return item.catalogo_item?.unidade ?? "un";
}

function formatQty(qty: number): string {
  const n = Number(qty);
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : String(n);
}

/** Linhas da lista — nome ··· quantidade unidade [Excluir]. */
export function OsSeparationListRows({ itens, onRemover, disabled }: Props) {
  if (itens.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-cc-border bg-cc-surface/40 px-3 py-6 text-center text-sm text-cc-muted">
        {t("os.workspace.project.separationListEmpty")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-cc-border/60 rounded-sm border border-cc-border/80 bg-white">
      {itens.map((item) => (
        <li
          key={item._key}
          className="flex items-center gap-2 px-3 py-2.5 text-sm"
        >
          <span className="min-w-0 shrink">
            <span className="block truncate font-light text-cc-ink">
              {labelItem(item)}
            </span>
            {labelDetail(item) ? (
              <span className="mt-0.5 block truncate text-xs font-light text-cc-muted">
                {labelDetail(item)}
              </span>
            ) : null}
          </span>
          <span
            className="min-w-[1rem] flex-1 border-b border-dotted border-cc-border/80"
            aria-hidden
          />
          <span className="shrink-0 tabular-nums font-medium text-cc-deep">
            {formatQty(item.quantity)} {labelUnit(item)}
          </span>
          {onRemover ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemover(item._key)}
              className="shrink-0 text-xs font-medium text-cc-red hover:underline disabled:opacity-40"
            >
              {t("os.workspace.project.removeItem")}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
