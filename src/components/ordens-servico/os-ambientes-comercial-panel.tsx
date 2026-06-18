"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { salvarAmbientesComercial } from "@/app/ordens-servico/ambientes-actions";
import {
  listarAnexosVisitaComUrls,
  removerAnexoVisitaComercial,
} from "@/app/ordens-servico/visita-comercial-actions";
import { OsPhotoUploadActions } from "@/components/ordens-servico/os-photo-upload-actions";
import { OsValorEditableField } from "@/components/ordens-servico/os-valores-etapa-fields";
import {
  ambienteRowFromDb,
  createEmptyAmbienteRow,
  formatSomaAmbientesUsd,
  somaValoresAmbientes,
  type OsAmbienteFormRow,
} from "@/lib/ordens-servico/os-ambientes";
import { uploadAnexosVisitaViaApi } from "@/lib/ordens-servico/upload-anexos-client";
import { t } from "@/lib/i18n";
import type { OrdemServicoWithRelations, OsAnexoComUrl, OsAmbiente } from "@/lib/types/database";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus disabled:cursor-not-allowed disabled:bg-cc-border-light";

const textareaClass =
  "w-full min-h-[88px] resize-y rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus disabled:cursor-not-allowed disabled:bg-cc-border-light";

type Props = {
  ordem: OrdemServicoWithRelations;
  disabled?: boolean;
  valorComercial: string;
  onValorComercialChange: (value: string) => void;
  onValorComercialBlur: () => void;
  onAmbientesSaved?: (ambientes: OsAmbiente[]) => void;
  onRowsChange?: (rows: OsAmbienteFormRow[]) => void;
  onMessage?: (message: string | null) => void;
};

function VisitPhotoGrid({
  anexos,
  disabled,
  onRemove,
}: {
  anexos: OsAnexoComUrl[];
  disabled?: boolean;
  onRemove: (id: string) => void;
}) {
  if (anexos.length === 0) {
    return (
      <p className="mt-2 text-xs text-amber-700">
        {t("os.ambientes.photosRequired")}
      </p>
    );
  }

  return (
    <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
      {anexos.map((a) => (
        <li
          key={a.id}
          className="relative aspect-square overflow-hidden rounded-sm border border-cc-border"
        >
          {a.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.url} alt={a.nome_arquivo} className="h-full w-full object-cover" />
          ) : null}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!confirm(t("os.ambientes.removePhotoConfirm"))) return;
              onRemove(a.id);
            }}
            className="absolute right-1 top-1 rounded-sm bg-black/55 px-1 text-[10px] text-white"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

export function OsAmbientesComercialPanel({
  ordem,
  disabled = false,
  valorComercial,
  onValorComercialChange,
  onValorComercialBlur,
  onAmbientesSaved,
  onRowsChange,
  onMessage,
}: Props) {
  const [rows, setRows] = useState<OsAmbienteFormRow[]>(() =>
    (ordem.ambientes ?? []).length > 0
      ? (ordem.ambientes ?? []).map(ambienteRowFromDb)
      : [],
  );
  const [anexos, setAnexos] = useState<OsAnexoComUrl[]>(ordem.anexos_visita ?? []);
  const [pending, startTransition] = useTransition();

  const useMultiAmbiente = rows.some((r) => r.nome.trim().length > 0);

  const carregarAnexos = useCallback(async () => {
    const { anexos: lista, error } = await listarAnexosVisitaComUrls(ordem.id);
    if (!error) setAnexos(lista);
  }, [ordem.id]);

  useEffect(() => {
    void carregarAnexos();
  }, [carregarAnexos]);

  useEffect(() => {
    if ((ordem.ambientes ?? []).length > 0) {
      setRows((ordem.ambientes ?? []).map(ambienteRowFromDb));
    }
  }, [ordem.ambientes, ordem.id]);

  useEffect(() => {
    onRowsChange?.(rows);
  }, [rows, onRowsChange]);

  const somaAmbientes = useMemo(() => somaValoresAmbientes(rows), [rows]);

  useEffect(() => {
    if (!useMultiAmbiente) return;
    const formatted = formatSomaAmbientesUsd(somaAmbientes);
    if (formatted) {
      onValorComercialChange(formatted);
    }
  }, [somaAmbientes, useMultiAmbiente, onValorComercialChange]);

  const anexosPorAmbiente = useMemo(() => {
    const map = new Map<string, OsAnexoComUrl[]>();
    for (const a of anexos) {
      if (!a.os_ambiente_id) continue;
      const list = map.get(a.os_ambiente_id) ?? [];
      list.push(a);
      map.set(a.os_ambiente_id, list);
    }
    return map;
  }, [anexos]);

  const anexosGerais = useMemo(
    () => anexos.filter((a) => !a.os_ambiente_id),
    [anexos],
  );

  function updateRow(id: string, patch: Partial<OsAmbienteFormRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, createEmptyAmbienteRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function salvarAmbientes(): Promise<boolean> {
    return new Promise((resolve) => {
      startTransition(async () => {
        onMessage?.(null);
        const toSave = rows.filter((r) => r.nome.trim().length > 0);
        const r = await salvarAmbientesComercial(ordem.id, toSave);
        if (!r.ok) {
          onMessage?.(r.message);
          resolve(false);
          return;
        }
        if (r.ambientes) {
          setRows(r.ambientes.map(ambienteRowFromDb));
          onAmbientesSaved?.(r.ambientes);
        }
        resolve(true);
      });
    });
  }

  async function onFilesForAmbiente(ambienteId: string, nome: string, files: FileList | null) {
    if (!files?.length) return;
    if (!nome.trim()) {
      onMessage?.(t("os.ambientes.nameRequiredForPhotos"));
      return;
    }
    startTransition(async () => {
      onMessage?.(null);
      const saved = await salvarAmbientes();
      if (!saved) return;
      const r = await uploadAnexosVisitaViaApi(ordem.id, files, ambienteId);
      if (!r.ok) {
        onMessage?.(r.message);
        return;
      }
      await carregarAnexos();
    });
  }

  function onFilesLegacy(files: FileList | null) {
    if (!files?.length) return;
    startTransition(async () => {
      onMessage?.(null);
      const r = await uploadAnexosVisitaViaApi(ordem.id, files);
      if (!r.ok) {
        onMessage?.(r.message);
        return;
      }
      await carregarAnexos();
    });
  }

  function removerAnexo(anexoId: string) {
    startTransition(async () => {
      const r = await removerAnexoVisitaComercial(anexoId);
      if (r.ok) await carregarAnexos();
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
              {t("os.ambientes.title")}
            </p>
            <p className="mt-1 text-xs font-light text-cc-muted">
              {t("os.ambientes.hint")}
            </p>
          </div>
          <button
            type="button"
            disabled={disabled || pending || rows.length >= 10}
            onClick={addRow}
            className="rounded-sm border border-cc-border bg-white px-3 py-1.5 text-xs font-medium text-cc-deep hover:bg-cc-border-light disabled:opacity-40"
          >
            {t("os.ambientes.add")}
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-cc-muted">{t("os.ambientes.empty")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {rows.map((row, index) => (
              <li
                key={row.id}
                className="rounded-sm border border-cc-border bg-white/80 p-3 shadow-sheet"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted">
                    {t("os.ambientes.roomLabel", { n: String(index + 1) })}
                  </p>
                  <button
                    type="button"
                    disabled={disabled || pending}
                    onClick={() => removeRow(row.id)}
                    className="text-xs text-cc-muted hover:text-cc-red"
                  >
                    {t("os.ambientes.remove")}
                  </button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="text-[11px] font-medium text-cc-muted">
                      {t("os.ambientes.name")}
                    </span>
                    <input
                      type="text"
                      className={`mt-1 ${inputClass}`}
                      value={row.nome}
                      disabled={disabled || pending}
                      placeholder={t("os.ambientes.namePlaceholder")}
                      onChange={(e) => updateRow(row.id, { nome: e.target.value })}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-[11px] font-medium text-cc-muted">
                      {t("os.ambientes.specifications")}
                    </span>
                    <textarea
                      className={`mt-1 ${textareaClass}`}
                      value={row.especificacoes}
                      disabled={disabled || pending}
                      placeholder={t("os.ambientes.specificationsPlaceholder")}
                      onChange={(e) =>
                        updateRow(row.id, { especificacoes: e.target.value })
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-medium text-cc-muted">
                      {t("os.ambientes.partialValue")}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`mt-1 ${inputClass}`}
                      value={row.valor_comercial}
                      disabled={disabled || pending}
                      placeholder="0.00"
                      onChange={(e) =>
                        updateRow(row.id, { valor_comercial: e.target.value })
                      }
                    />
                  </label>
                </div>

                {row.nome.trim() ? (
                  <div className="mt-3 border-t border-cc-border pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
                      {t("os.visit.photos")}
                    </p>
                    <OsPhotoUploadActions
                      disabled={disabled || pending}
                      onFilesSelected={(files) =>
                        void onFilesForAmbiente(row.id, row.nome, files)
                      }
                    />
                    <VisitPhotoGrid
                      anexos={anexosPorAmbiente.get(row.id) ?? []}
                      disabled={disabled || pending}
                      onRemove={removerAnexo}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {useMultiAmbiente ? (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={disabled || pending}
              onClick={() => void salvarAmbientes()}
              className="text-[11px] font-medium text-cc-muted underline-offset-2 hover:text-cc-ink hover:underline disabled:opacity-40"
            >
              {pending ? t("os.ambientes.saving") : t("os.ambientes.save")}
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
        <OsValorEditableField
          label={t("os.workspace.valores.commercial")}
          value={valorComercial}
          disabled={disabled || pending}
          onChange={onValorComercialChange}
          onBlur={onValorComercialBlur}
        />
        {useMultiAmbiente && somaAmbientes > 0 ? (
          <p className="mt-2 text-xs font-light text-cc-muted">
            {t("os.ambientes.suggestedTotal", {
              value: formatSomaAmbientesUsd(somaAmbientes),
            })}
          </p>
        ) : (
          <p className="mt-2 text-xs font-light text-cc-muted">
            {t("os.workspace.valores.commercialHint")}
          </p>
        )}
      </section>

      {!useMultiAmbiente ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
            {t("os.visit.photos")}
          </p>
          <p className="mt-1 text-xs font-light text-cc-muted">{t("os.visit.photosHint")}</p>
          <OsPhotoUploadActions
            disabled={disabled || pending}
            onFilesSelected={onFilesLegacy}
          />
          <VisitPhotoGrid
            anexos={anexosGerais.length > 0 ? anexosGerais : anexos}
            disabled={disabled || pending}
            onRemove={removerAnexo}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Save environments before finishing visit (multi-room flow). */
export async function persistAmbientesBeforeFinish(
  osId: string,
  rows: OsAmbienteFormRow[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const toSave = rows.filter((r) => r.nome.trim().length > 0);
  if (toSave.length === 0) {
    return { ok: true };
  }
  const r = await salvarAmbientesComercial(osId, toSave);
  if (!r.ok) return r;
  return { ok: true };
}
