"use client";

import { useEffect, useState, useTransition } from "react";

import { confirmarConferenciaSeparacao } from "@/app/ordens-servico/instalacao-actions";
import { OsOperacionalSheet } from "@/components/ordens-servico/os-operacional-sheet";
import { t } from "@/lib/i18n";
import { isSeparationItemChecked } from "@/lib/ordens-servico/installation-workspace";
import type { OsSeparationListItem } from "@/lib/types/database";

type Props = {
  osId: string;
  itensIniciais: OsSeparationListItem[];
  open: boolean;
  onClose: () => void;
  onSalvo: () => void;
};

function toDraftMap(itens: OsSeparationListItem[]): Map<string, boolean> {
  return new Map(
    itens.map((item) => [item.id, isSeparationItemChecked(item)]),
  );
}

export function OsInstallationChecklistModal({
  osId,
  itensIniciais,
  open,
  onClose,
  onSalvo,
}: Props) {
  const [draft, setDraft] = useState<Map<string, boolean>>(() =>
    toDraftMap(itensIniciais),
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setDraft(toDraftMap(itensIniciais));
      setMsg(null);
    }
  }, [open, itensIniciais]);

  function toggleItem(itemId: string) {
    setDraft((prev) => {
      const next = new Map(prev);
      next.set(itemId, !next.get(itemId));
      return next;
    });
  }

  function confirmar() {
    startTransition(async () => {
      setMsg(null);
      const payload = [...draft.entries()].map(([item_id, checked]) => ({
        item_id,
        checked,
      }));
      const r = await confirmarConferenciaSeparacao(osId, payload);
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      onSalvo();
      onClose();
    });
  }

  return (
    <OsOperacionalSheet
      open={open}
      onClose={onClose}
      ariaLabel={t("os.workspace.installation.checklistModalTitle")}
    >
      <div className="space-y-4">
        <header>
          <h2 className="font-display text-lg font-light text-cc-ink">
            {t("os.workspace.installation.checklistModalTitle")}
          </h2>
          <p className="mt-1 text-xs font-light text-cc-muted">
            {t("os.workspace.installation.checklistModalSubtitle")}
          </p>
        </header>

        <ul className="divide-y divide-cc-border/60 rounded-sm border border-cc-border/80 bg-white">
          {itensIniciais.map((item) => {
            const checked = draft.get(item.id) ?? false;
            const nome = item.catalogo_item?.nome ?? "—";
            return (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={pending}
                    onChange={() => toggleItem(item.id)}
                    className="h-4 w-4 shrink-0 rounded border-cc-border accent-cc-ink"
                  />
                  <span
                    className={`text-sm ${checked ? "text-cc-muted line-through" : "text-cc-ink"}`}
                  >
                    {nome}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="flex gap-2 border-t border-cc-border-light pt-3">
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
            disabled={pending}
            onClick={confirmar}
            className="flex-1 rounded-sm bg-cc-ink py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-40"
          >
            {pending
              ? t("os.workspace.installation.savingConference")
              : t("os.workspace.installation.confirmConference")}
          </button>
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
