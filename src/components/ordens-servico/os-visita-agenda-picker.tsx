"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Field } from "@/components/ui/field";
import { DISPLAY_LOCALE } from "@/lib/i18n";
import { EquipeCompromissosDia } from "@/components/ordens-servico/equipe-compromissos-dia";
import { buscarAgendaEquipeNoDia } from "@/app/ordens-servico/agenda-disponibilidade";
import type { CompromissoEquipeDia } from "@/lib/ordens-servico/agenda-equipe-dia";
import { defaultVisitaDateTime } from "@/lib/ordens-servico/datetime";
import { hexToRgba } from "@/lib/ui/equipe-color";
import {
  compararYmd,
  diasDoMesCalendario,
  formatDataVisitaCurta,
  hojeOperacionalYmd,
  slotEstaOcupado,
  VISITA_SLOTS_HORARIOS,
} from "@/lib/ordens-servico/visita-slots";
import type { Equipe } from "@/lib/types/database";

type Props = {
  equipes: Equipe[];
  equipeId: string;
  dataVisita: string;
  horaVisita: string;
  onDataChange: (data: string) => void;
  onHoraChange: (hora: string) => void;
  excluirEventoId?: string | null;
  /** Rótulo do campo — padrão: visita técnica. */
  fieldLabel?: string;
  /** YYYY-MM-DD — dias anteriores ficam desabilitados (ex.: data prevista do material). */
  dataMinimaYmd?: string | null;
};

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function OsVisitaAgendaPicker({
  equipes,
  equipeId,
  dataVisita,
  horaVisita,
  onDataChange,
  onHoraChange,
  excluirEventoId,
  fieldLabel = "Visit date and time",
  dataMinimaYmd = null,
}: Props) {
  const defaults = useMemo(() => defaultVisitaDateTime(), []);
  const [open, setOpen] = useState(false);
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [compromissos, setCompromissos] = useState<CompromissoEquipeDia[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const equipe = equipes.find((e) => e.id === equipeId);
  const cor = equipe?.cor_primaria ?? "#7189a8";

  const [viewYear, viewMonth] = useMemo(() => {
    const base = dataVisita || defaults.data;
    const [y, m] = base.split("-").map(Number);
    return [y, m - 1] as const;
  }, [dataVisita, defaults.data]);

  const [calendarYear, setCalendarYear] = useState(viewYear);
  const [calendarMonth, setCalendarMonth] = useState(viewMonth);

  useEffect(() => {
    setCalendarYear(viewYear);
    setCalendarMonth(viewMonth);
  }, [viewYear, viewMonth, open]);

  const carregarAgendaDia = useCallback(async () => {
    if (!equipeId || !dataVisita) {
      setOcupados([]);
      setCompromissos([]);
      return;
    }
    setLoadingSlots(true);
    setSlotsError(null);
    const r = await buscarAgendaEquipeNoDia(
      equipeId,
      dataVisita,
      excluirEventoId,
    );
    setLoadingSlots(false);
    if (r.error) {
      setSlotsError(r.error);
      setOcupados([]);
      setCompromissos([]);
      return;
    }
    setOcupados(r.ocupados);
    setCompromissos(r.compromissos);
    if (horaVisita && slotEstaOcupado(r.ocupados, horaVisita)) {
      onHoraChange("");
    }
  }, [equipeId, dataVisita, excluirEventoId, horaVisita, onHoraChange]);

  useEffect(() => {
    if (!equipeId || !dataVisita) {
      setOcupados([]);
      setCompromissos([]);
      return;
    }
    void carregarAgendaDia();
  }, [equipeId, dataVisita, carregarAgendaDia]);

  useEffect(() => {
    if (!equipeId) {
      onHoraChange("");
    }
  }, [equipeId, onHoraChange]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const hoje = hojeOperacionalYmd();
  const limiteMinimo = useMemo(() => {
    if (!dataMinimaYmd || !/^\d{4}-\d{2}-\d{2}$/.test(dataMinimaYmd)) {
      return hoje;
    }
    return compararYmd(dataMinimaYmd, hoje) > 0 ? dataMinimaYmd : hoje;
  }, [dataMinimaYmd, hoje]);

  const monthLabel = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    month: "long",
    year: "numeric",
  }).format(new Date(calendarYear, calendarMonth, 1));

  const cells = diasDoMesCalendario(calendarYear, calendarMonth);

  const triggerLabel =
    dataVisita && horaVisita
      ? `${formatDataVisitaCurta(dataVisita)} · ${horaVisita}`
      : dataVisita
        ? `${formatDataVisitaCurta(dataVisita)} — choose a time`
        : "Choose date and time";

  return (
    <div className="space-y-2" ref={panelRef}>
      <input type="hidden" name="data_visita" value={dataVisita} required />
      <input type="hidden" name="hora_visita" value={horaVisita} required />

      <Field label={fieldLabel}>
        <button
          type="button"
          disabled={!equipeId}
          onClick={() => equipeId && setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-left text-sm font-light text-cc-ink transition hover:border-cc-blue-soft focus:border-cc-blue-focus focus:outline-none focus:shadow-focus disabled:cursor-not-allowed disabled:bg-cc-border-light disabled:text-cc-muted"
        >
          <span className="flex min-w-0 items-center gap-2">
            {equipeId ? (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: cor }}
                aria-hidden
              />
            ) : null}
            <span className="truncate">
              {!equipeId
                ? "Select a team first"
                : triggerLabel}
            </span>
          </span>
          <span className="shrink-0 text-xs text-cc-muted" aria-hidden>
            {open ? "▲" : "▼"}
          </span>
        </button>
      </Field>

      {equipeId && dataVisita ? (
        <div className="rounded-ds-lg border border-cc-border-light bg-cc-canvas/40 px-3 py-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-subtle">
            Appointments for the day
          </p>
          <EquipeCompromissosDia
            compromissos={compromissos}
            equipeNome={equipe?.nome}
            loading={loadingSlots}
            error={slotsError}
          />
        </div>
      ) : null}

      {open && equipeId ? (
        <div className="relative z-50 rounded-ds-lg border border-cc-border bg-cc-surface p-3 shadow-lift">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-sm px-2 py-1 text-sm text-cc-muted hover:bg-cc-border-light"
              onClick={() => {
                if (calendarMonth === 0) {
                  setCalendarMonth(11);
                  setCalendarYear((y) => y - 1);
                } else {
                  setCalendarMonth((m) => m - 1);
                }
              }}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="text-sm font-medium capitalize text-cc-ink">
              {monthLabel}
            </span>
            <button
              type="button"
              className="rounded-sm px-2 py-1 text-sm text-cc-muted hover:bg-cc-border-light"
              onClick={() => {
                if (calendarMonth === 11) {
                  setCalendarMonth(0);
                  setCalendarYear((y) => y + 1);
                } else {
                  setCalendarMonth((m) => m + 1);
                }
              }}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-cc-muted">
            {WEEKDAYS.map((d, i) => (
              <span key={`${d}-${i}`}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((ymd, idx) => {
              if (!ymd) {
                return <span key={`empty-${idx}`} className="h-8" />;
              }
              const antesDoLimite = compararYmd(ymd, limiteMinimo) < 0;
              const selected = ymd === dataVisita;
              const disabled = antesDoLimite;
              return (
                <button
                  key={ymd}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onDataChange(ymd);
                    onHoraChange("");
                  }}
                  className={`h-8 rounded-sm text-xs font-medium transition ${
                    disabled
                      ? "cursor-not-allowed text-cc-subtle opacity-30"
                      : selected
                        ? "text-white shadow-sheet"
                        : "text-cc-deep hover:bg-cc-border-light"
                  }`}
                  style={
                    selected && !disabled
                      ? { backgroundColor: cor }
                      : undefined
                  }
                >
                  {Number(ymd.slice(8, 10))}
                </button>
              );
            })}
          </div>

          {dataVisita ? (
            <div className="mt-4 border-t border-cc-border-light pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
                Times — {equipe?.nome ?? "Team"}
              </p>
              {loadingSlots ? (
                <p className="text-xs text-cc-muted">Loading schedule…</p>
              ) : null}
              {slotsError ? (
                <p className="text-xs text-cc-red">{slotsError}</p>
              ) : null}
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-4">
                {VISITA_SLOTS_HORARIOS.map((slot) => {
                  const busy = ocupados.includes(slot);
                  const selected = horaVisita === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        onHoraChange(slot);
                        setOpen(false);
                      }}
                      className={`rounded-sm border px-1 py-2 text-xs font-medium transition ${
                        busy
                          ? "cursor-not-allowed border-cc-border bg-cc-border-light text-cc-subtle opacity-40"
                          : selected
                            ? "border-transparent text-white shadow-sheet"
                            : "border-cc-border bg-white text-cc-deep hover:shadow-sheet"
                      }`}
                      style={
                        busy
                          ? undefined
                          : selected
                            ? { backgroundColor: cor, borderColor: cor }
                            : {
                                borderColor: hexToRgba(cor, 0.45),
                                backgroundColor: hexToRgba(cor, 0.1),
                                color: cor,
                              }
                      }
                      title={busy ? "Time slot taken" : `Available ${slot}`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
              {!horaVisita && !loadingSlots ? (
                <p className="mt-2 text-xs font-light text-cc-muted">
                  Tap an available time slot.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs font-light text-cc-muted">
              Select a day on the calendar.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
