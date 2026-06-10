"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { salvarListaSeparacao } from "@/app/ordens-servico/projeto-actions";
import { OsSeparationListRows } from "@/components/ordens-servico/workspace/os-separation-list-rows";
import { OsOperacionalSheet } from "@/components/ordens-servico/os-operacional-sheet";
import { t } from "@/lib/i18n";
import type { SeparationListItemInput } from "@/lib/ordens-servico/separation-list";
import type { CatalogoItem, OsSeparationListItem } from "@/lib/types/database";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

const labelClass =
  "block text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted";

type DraftItem = SeparationListItemInput & {
  _key: string;
  catalogo_item?: OsSeparationListItem["catalogo_item"];
};

type Props = {
  osId: string;
  clienteNome: string;
  catalogo: CatalogoItem[];
  itensIniciais: OsSeparationListItem[];
  open: boolean;
  mode: "edit" | "view";
  onClose: () => void;
  onSalvo?: () => void;
};

function groupCatalogoPorCategory(catalogo: CatalogoItem[]) {
  const map = new Map<string, CatalogoItem[]>();
  for (const item of catalogo) {
    const list = map.get(item.categoria) ?? [];
    list.push(item);
    map.set(item.categoria, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "en-US"));
}

function toDraft(itens: OsSeparationListItem[]): DraftItem[] {
  return itens.map((item) => ({
    _key: item.id,
    id: item.id,
    item_id: item.item_id,
    quantity: Number(item.quantity),
    catalogo_item: item.catalogo_item,
  }));
}

export function OsSeparationListModal({
  osId,
  clienteNome,
  catalogo,
  itensIniciais,
  open,
  mode,
  onClose,
  onSalvo,
}: Props) {
  const readOnly = mode === "view";
  const [itens, setItens] = useState<DraftItem[]>(() => toDraft(itensIniciais));
  const [selItemId, setSelItemId] = useState("");
  const [selQty, setSelQty] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const catalogoPorCategory = useMemo(
    () => groupCatalogoPorCategory(catalogo),
    [catalogo],
  );

  const catalogoMap = useMemo(
    () => new Map(catalogo.map((item) => [item.id, item])),
    [catalogo],
  );

  const selCatalogItem = catalogoMap.get(selItemId);

  useEffect(() => {
    if (open) {
      setItens(toDraft(itensIniciais));
      setSelItemId("");
      setSelQty(1);
      setMsg(null);
    }
  }, [open, itensIniciais]);

  function removerItem(key: string) {
    setItens((prev) => prev.filter((item) => item._key !== key));
  }

  function adicionarNaLista() {
    setMsg(null);
    const item_id = selItemId.trim();
    if (!item_id) {
      setMsg(t("os.workspace.project.itemSelectRequired"));
      return;
    }
    const quantity = Number(selQty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMsg(t("os.workspace.project.itemQuantityInvalid"));
      return;
    }

    const cat = catalogoMap.get(item_id);
    setItens((prev) => [
      ...prev,
      {
        _key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        item_id,
        quantity: Math.round(quantity * 1000) / 1000,
        catalogo_item: cat
          ? {
              id: cat.id,
              nome: cat.nome,
              categoria: cat.categoria,
              unidade: cat.unidade,
            }
          : null,
      },
    ]);
    setSelItemId("");
    setSelQty(1);
  }

  function salvar() {
    startTransition(async () => {
      setMsg(null);
      const payload: SeparationListItemInput[] = itens.map(
        ({ _key: _, catalogo_item: __, ...item }) => item,
      );
      const r = await salvarListaSeparacao(osId, payload);
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      onSalvo?.();
      onClose();
    });
  }

  const titulo = `${t("os.workspace.project.separationListTitle")} — ${clienteNome}`;

  return (
    <OsOperacionalSheet open={open} onClose={onClose} ariaLabel={titulo}>
      <div className="space-y-4">
        <header>
          <h2 className="font-display text-lg font-light text-cc-ink">
            {t("os.workspace.project.separationListTitle")}
          </h2>
          <p className="mt-1 text-xs font-light text-cc-muted">
            {readOnly
              ? t("os.workspace.project.separationListViewSubtitle")
              : t("os.workspace.project.separationListSubtitle")}
          </p>
        </header>

        {!readOnly && catalogo.length === 0 ? (
          <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
            {t("os.workspace.project.catalogEmpty")}
          </p>
        ) : null}

        {!readOnly ? (
          <div className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3 space-y-3">
            <div>
              <label className={labelClass}>
                {t("os.workspace.project.itemSelect")}
              </label>
              <select
                disabled={pending || catalogo.length === 0}
                className={`mt-1 ${inputClass}`}
                value={selItemId}
                onChange={(e) => setSelItemId(e.target.value)}
              >
                <option value="">
                  {t("os.workspace.project.itemSelectPlaceholder")}
                </option>
                {catalogoPorCategory.map(([categoria, lista]) => (
                  <optgroup key={categoria} label={categoria}>
                    {lista.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome} ({cat.unidade})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                {t("os.workspace.project.itemQuantity")}
                {selCatalogItem ? (
                  <span className="ml-1 font-normal normal-case text-cc-subtle">
                    · {selCatalogItem.unidade}
                  </span>
                ) : null}
              </label>
              <input
                type="number"
                min={0.001}
                step="any"
                disabled={pending || catalogo.length === 0}
                className={`mt-1 ${inputClass}`}
                value={selQty}
                onChange={(e) => setSelQty(Number(e.target.value))}
              />
            </div>
            <button
              type="button"
              disabled={pending || catalogo.length === 0}
              onClick={adicionarNaLista}
              className="w-full rounded-sm border border-cc-border bg-white py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light disabled:opacity-40"
            >
              + {t("os.workspace.project.addItem")}
            </button>
          </div>
        ) : null}

        <OsSeparationListRows
          itens={itens}
          disabled={pending}
          onRemover={readOnly ? undefined : removerItem}
        />

        <div className="flex gap-2 border-t border-cc-border-light pt-3">
          {readOnly ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-sm bg-cc-ink py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white"
            >
              {t("os.workspace.project.closeList")}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={onClose}
                className="flex-1 rounded-sm border border-cc-border py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted"
              >
                {t("os.workspace.financial.cancel")}
              </button>
              <button
                type="button"
                disabled={pending || catalogo.length === 0}
                onClick={salvar}
                className="flex-1 rounded-sm bg-cc-ink py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-40"
              >
                {pending
                  ? t("os.workspace.project.savingList")
                  : t("os.workspace.project.saveList")}
              </button>
            </>
          )}
        </div>

        {msg ? (
          <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
            {msg}
          </p>
        ) : null}
      </div>
    </OsOperacionalSheet>
  );
}
