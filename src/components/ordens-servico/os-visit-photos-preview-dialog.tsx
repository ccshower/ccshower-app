"use client";

import { formatWorkspaceDateTime } from "@/components/ordens-servico/workspace/os-workspace-utils";
import { t } from "@/lib/i18n";
import type { VisitPhotoPreviewItem } from "@/lib/ordens-servico/os-ambientes";

type Props = {
  open: boolean;
  onClose: () => void;
  itens: VisitPhotoPreviewItem[];
  index: number;
  onIndex: (next: number) => void;
};

export function OsVisitPhotosPreviewDialog({
  open,
  onClose,
  itens,
  index,
  onIndex,
}: Props) {
  const current = itens[index];
  const canPrev = index > 0;
  const canNext = index < itens.length - 1;

  if (!open || !current?.url) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 h-[100dvh] w-[100dvw] bg-black/80 p-0 backdrop:bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={t("os.workspace.contextOpenPhoto")}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-white">
          <div className="min-w-0">
            {current.ambienteNome ? (
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-white/85">
                {current.ambienteNome}
              </p>
            ) : null}
            <p className="truncate text-sm font-medium">{current.nome_arquivo}</p>
            <p className="text-[11px] text-white/70">
              {formatWorkspaceDateTime(current.criado_em)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm bg-white/10 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-white/15"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 px-3 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.nome_arquivo}
            className="mx-auto h-full max-h-[calc(100dvh-120px)] w-auto max-w-full rounded-sm object-contain"
          />
        </div>

        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => onIndex(index - 1)}
            className="rounded-sm bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-white/15 disabled:opacity-40"
          >
            {t("os.workspace.contextPrev")}
          </button>
          <p className="text-xs text-white/70">
            {index + 1} / {itens.length}
          </p>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => onIndex(index + 1)}
            className="rounded-sm bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-white/15 disabled:opacity-40"
          >
            {t("os.workspace.contextNext")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
