"use client";

import { OperationalModal } from "@/components/operacional/operational-modal";
import {
  formatCalendarRescheduleDateTime,
  type CalendarRescheduleDraft,
} from "@/lib/calendar/operational-calendar";
import { t, tEventType } from "@/lib/i18n";

type Props = {
  draft: CalendarRescheduleDraft | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: () => void;
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

export function CalendarRescheduleModal({
  draft,
  saving = false,
  onClose,
  onConfirm,
}: Props) {
  return (
    <OperationalModal
      open={draft != null}
      title={t("calendar.reschedule.title")}
      onClose={onClose}
    >
      {draft ? (
        <div className="space-y-4">
          <dl className="rounded-sm border border-cc-border/70 bg-white px-3">
            <DetailRow label={t("calendar.reschedule.client")} value={draft.evento.cliente_nome} />
            <DetailRow
              label={t("calendar.reschedule.type")}
              value={tEventType(draft.evento.tipo_evento)}
            />
            <DetailRow
              label={t("calendar.reschedule.team")}
              value={draft.evento.equipe_nome}
            />
            <DetailRow
              label={t("calendar.reschedule.currentDate")}
              value={formatCalendarRescheduleDateTime(draft.currentStartIso)}
            />
            <DetailRow
              label={t("calendar.reschedule.newDate")}
              value={formatCalendarRescheduleDateTime(draft.newStartIso)}
            />
          </dl>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-sm border border-cc-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted hover:bg-cc-border-light disabled:opacity-50"
            >
              {t("calendar.reschedule.cancel")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onConfirm}
              className="rounded-sm bg-cc-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-cc-deep disabled:opacity-50"
            >
              {t("calendar.reschedule.confirm")}
            </button>
          </div>
        </div>
      ) : null}
    </OperationalModal>
  );
}
