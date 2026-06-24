"use client";

import { OperationalModal } from "@/components/operacional/operational-modal";
import { t } from "@/lib/i18n";
import { formatYmdAmerican } from "@/lib/ordens-servico/datetime";

export type OsAgendaSlotConflictDraft = {
  equipeNome: string;
  dataYmd: string;
  horaSolicitada: string;
  sugestoes: string[];
  alreadyBookedMessage: string;
};

type Props = {
  draft: OsAgendaSlotConflictDraft | null;
  onClose: () => void;
  onPickSlot: (slot: string) => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-cc-border/50 py-2.5 last:border-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-subtle">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-light text-cc-ink">{value}</dd>
    </div>
  );
}

export function OsAgendaSlotConflictModal({
  draft,
  onClose,
  onPickSlot,
}: Props) {
  return (
    <OperationalModal
      open={draft != null}
      title={t("calendar.conflict.title")}
      onClose={onClose}
    >
      {draft ? (
        <div className="space-y-4">
          <dl className="rounded-sm border border-cc-border/70 bg-white px-3">
            <DetailRow
              label={t("calendar.conflict.team")}
              value={draft.equipeNome}
            />
            <DetailRow
              label={t("calendar.conflict.date")}
              value={formatYmdAmerican(draft.dataYmd)}
            />
            <DetailRow
              label={t("calendar.conflict.requestedTime")}
              value={draft.horaSolicitada}
            />
          </dl>

          <p className="text-sm font-light text-cc-deep">
            {draft.alreadyBookedMessage}
          </p>

          {draft.sugestoes.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
                {t("calendar.conflict.suggestionsTitle")}
              </p>
              <ul className="mt-2 space-y-1.5">
                {draft.sugestoes.map((slot) => (
                  <li key={slot} className="text-sm tabular-nums text-cc-ink">
                    {slot}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-cc-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted hover:bg-cc-border-light"
            >
              {t("calendar.conflict.cancel")}
            </button>
            {draft.sugestoes.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => onPickSlot(slot)}
                className="rounded-sm bg-cc-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-cc-deep"
              >
                {t("calendar.conflict.scheduleAt", { time: slot })}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </OperationalModal>
  );
}
