"use client";

import { OperationalModal } from "@/components/operacional/operational-modal";
import type { CalendarEvento } from "@/lib/calendar/operational-calendar";
import type { AgendaSlotSugestao } from "@/lib/ordens-servico/visita-slots";
import { formatIntervaloAgenda } from "@/lib/ordens-servico/visita-slots";
import { t } from "@/lib/i18n";

function formatConflictDateYmd(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function formatSugestaoLabel(
  sugestao: AgendaSlotSugestao,
  targetYmd: string,
): string {
  const intervalo = formatIntervaloAgenda(sugestao.hora, sugestao.horaFim);
  if (sugestao.dataYmd === targetYmd) return intervalo;
  return `${formatConflictDateYmd(sugestao.dataYmd)} ${intervalo}`;
}

export type CalendarConflictDraft = {
  evento: CalendarEvento;
  sourceYmd: string;
  targetYmd: string;
  currentStartIso: string;
  requestedStartIso: string;
  horaSolicitada: string;
  sugestoes: AgendaSlotSugestao[];
  message?: string;
};

type Props = {
  draft: CalendarConflictDraft | null;
  saving?: boolean;
  pickingSlotKey?: string | null;
  onClose: () => void;
  onPickSlot: (sugestao: AgendaSlotSugestao) => void;
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

export function CalendarConflictModal({
  draft,
  saving = false,
  pickingSlotKey = null,
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
              value={draft.evento.equipe_nome}
            />
            <DetailRow
              label={t("calendar.conflict.date")}
              value={formatConflictDateYmd(draft.targetYmd)}
            />
            <DetailRow
              label={t("calendar.conflict.requestedTime")}
              value={draft.horaSolicitada}
            />
          </dl>

          <p className="text-sm font-light text-cc-deep">
            {draft.message ?? t("calendar.conflict.alreadyBooked")}
          </p>

          {draft.sugestoes.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
                {t("calendar.conflict.suggestionsTitle")}
              </p>
              <ul className="mt-2 space-y-1.5">
                {draft.sugestoes.map((sugestao) => (
                  <li
                    key={`${sugestao.dataYmd}-${sugestao.hora}`}
                    className="text-sm tabular-nums text-cc-ink"
                  >
                    {formatSugestaoLabel(sugestao, draft.targetYmd)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm font-light text-cc-muted">
              {t("calendar.conflict.noSlotsAvailable")}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-sm border border-cc-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted hover:bg-cc-border-light disabled:opacity-50"
            >
              {t("calendar.conflict.cancel")}
            </button>
            {draft.sugestoes.map((sugestao) => {
              const slotKey = `${sugestao.dataYmd}-${sugestao.hora}`;
              const isPicking = saving && pickingSlotKey === slotKey;
              return (
                <button
                  key={slotKey}
                  type="button"
                  disabled={saving}
                  onClick={() => onPickSlot(sugestao)}
                  className="rounded-sm bg-cc-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-cc-deep disabled:opacity-50"
                >
                  {isPicking
                    ? t("calendar.reschedule.saving")
                    : sugestao.dataYmd === draft.targetYmd
                      ? t("calendar.conflict.scheduleAt", {
                          time: formatIntervaloAgenda(
                            sugestao.hora,
                            sugestao.horaFim,
                          ),
                        })
                      : t("calendar.conflict.scheduleAtDate", {
                          date: formatConflictDateYmd(sugestao.dataYmd),
                          time: formatIntervaloAgenda(
                            sugestao.hora,
                            sugestao.horaFim,
                          ),
                        })}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </OperationalModal>
  );
}
