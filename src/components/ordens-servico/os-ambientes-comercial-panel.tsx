"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { salvarAmbientesComercial } from "@/app/ordens-servico/ambientes-actions";
import {
  listarAnexosVisitaComUrls,
  removerAnexoVisitaComercial,
  salvarCoatingComercial,
} from "@/app/ordens-servico/visita-comercial-actions";
import { OsCoatingCheckbox } from "@/components/ordens-servico/os-coating-field";
import { OsPhotoUploadActions } from "@/components/ordens-servico/os-photo-upload-actions";
import { OsValorEditableField } from "@/components/ordens-servico/os-valores-etapa-fields";
import {
  ambienteRowFromDb,
  createEmptyAmbienteRow,
  formatSomaAmbientesUsd,
  somaValoresAmbientes,
  type OsAmbienteFormRow,
} from "@/lib/ordens-servico/os-ambientes";
import { coatingFromOrdem } from "@/lib/ordens-servico/os-coating";
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
    <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {anexos.map((a) => (
        <li key={a.id} className="space-y-1">
          <div className="relative aspect-square overflow-hidden rounded-sm border border-cc-border bg-cc-border-light">
            {a.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.url} alt={a.nome_arquivo} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-cc-muted">
                {a.nome_arquivo}
              </div>
            )}
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
          </div>
          <p className="truncate text-[10px] font-light text-cc-muted" title={a.nome_arquivo}>
            {a.nome_arquivo}
          </p>
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [coating, setCoating] = useState(() => coatingFromOrdem(ordem));

  const useMultiAmbiente = rows.some((r) => r.nome.trim().length > 0);

  const carregarAnexos = useCallback(async (): Promise<OsAnexoComUrl[] | null> => {
    const { anexos: lista, error } = await listarAnexosVisitaComUrls(ordem.id);
    if (error) {
      onMessage?.(error);
      return null;
    }
    setAnexos(lista);
    return lista;
  }, [ordem.id, onMessage]);

  useEffect(() => {
    setCoating(coatingFromOrdem(ordem));
  }, [ordem.coating, ordem.id]);

  useEffect(() => {
    setRows(
      (ordem.ambientes ?? []).length > 0
        ? (ordem.ambientes ?? []).map(ambienteRowFromDb)
        : [],
    );
    setAnexos(ordem.anexos_visita ?? []);
    void carregarAnexos();
    // Sincroniza apenas ao trocar de OS — evita sobrescrever rows locais após upload.
  }, [ordem.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onRowsChange?.(rows);
  }, [rows, onRowsChange]);

  const somaAmbientes = useMemo(() => somaValoresAmbientes(rows), [rows]);

  function salvarCoating(checked: boolean) {
    setCoating(checked);
    startTransition(async () => {
      const r = await salvarCoatingComercial(ordem.id, checked);
      if (!r.ok) onMessage?.(r.message);
    });
  }

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

  function anexosForRow(row: OsAmbienteFormRow): OsAnexoComUrl[] {
    const direct = anexosPorAmbiente.get(row.id) ?? [];
    if (direct.length > 0) return direct;

    const nome = row.nome.trim().toLowerCase();
    if (!nome) return [];

    const idsByName = (ordem.ambientes ?? [])
      .filter((a) => a.nome.trim().toLowerCase() === nome)
      .map((a) => a.id);

    if (idsByName.length === 0) return [];

    return anexos.filter(
      (a) => a.os_ambiente_id != null && idsByName.includes(a.os_ambiente_id),
    );
  }

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

  async function doSalvarAmbientes(
    notifyParent = true,
  ): Promise<{ ok: true; ambientes: OsAmbiente[] } | { ok: false }> {
    onMessage?.(null);
    setFeedback(null);
    const toSave = rows.filter((r) => r.nome.trim().length > 0);
    const r = await salvarAmbientesComercial(ordem.id, toSave);
    if (!r.ok) {
      onMessage?.(r.message);
      return { ok: false };
    }
    const ambientes = r.ambientes ?? [];
    if (ambientes.length > 0) {
      setRows(ambientes.map(ambienteRowFromDb));
    }
    if (notifyParent) {
      onAmbientesSaved?.(ambientes);
    }
    return { ok: true, ambientes };
  }

  function salvarAmbientes(): Promise<boolean> {
    return new Promise((resolve) => {
      startTransition(async () => {
        const r = await doSalvarAmbientes(true);
        if (r.ok) {
          await carregarAnexos();
          setFeedback(t("os.ambientes.savedOk"));
        }
        resolve(r.ok);
      });
    });
  }

  function onFilesForAmbiente(
    ambienteId: string,
    nome: string,
    especificacoes: string,
    valorComercial: string,
    sortOrder: number,
    files: File[],
  ) {
    const fileSnapshot = [...files];
    if (fileSnapshot.length === 0) return;
    if (!nome.trim()) {
      setUploadError(t("os.ambientes.nameRequiredForPhotos"));
      onMessage?.(t("os.ambientes.nameRequiredForPhotos"));
      return;
    }

    setUploadError(null);
    onMessage?.(null);
    setFeedback(null);
    setUploading(true);

    void (async () => {
      try {
        const r = await uploadAnexosVisitaViaApi(
          ordem.id,
          fileSnapshot,
          ambienteId,
          {
            id: ambienteId,
            nome: nome.trim(),
            especificacoes,
            valor_comercial: valorComercial,
            sort_order: sortOrder,
          },
        );
        if (!r.ok) {
          setUploadError(r.message);
          onMessage?.(r.message);
          return;
        }

        const loaded = await carregarAnexos();
        if (!loaded) return;

        const linkedCount = loaded.filter((a) => a.os_ambiente_id === ambienteId).length;
        if (r.uploaded > 0 && linkedCount === 0) {
          const msg = t("os.ambientes.photosLinkPending");
          setUploadError(msg);
          onMessage?.(msg);
          return;
        }

        setRows((prev) =>
          prev.map((row) =>
            row.id === ambienteId
              ? { ...row, nome: nome.trim(), especificacoes, valor_comercial: valorComercial }
              : row,
          ),
        );
        setFeedback(t("os.ambientes.photosUploaded", { count: String(r.uploaded) }));
      } finally {
        setUploading(false);
      }
    })();
  }

  function onFilesLegacy(files: File[]) {
    if (files.length === 0) return;
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
      {uploadError ? (
        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
          {uploadError}
        </p>
      ) : null}
      {feedback ? (
        <p className="rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {feedback}
        </p>
      ) : null}
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
            disabled={disabled || pending || uploading || rows.length >= 10}
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cc-muted">
                        {t("os.visit.photos")}
                      </p>
                      {anexosForRow(row).length > 0 ? (
                        <span className="text-[10px] font-medium text-cc-deep">
                          {t("os.ambientes.photoCount", {
                            count: String(anexosForRow(row).length),
                          })}
                        </span>
                      ) : null}
                    </div>
                    <OsPhotoUploadActions
                      disabled={disabled || pending || uploading}
                      onFilesSelected={(files) =>
                        onFilesForAmbiente(
                          row.id,
                          row.nome,
                          row.especificacoes,
                          row.valor_comercial,
                          index,
                          files,
                        )
                      }
                    />
                    <VisitPhotoGrid
                      anexos={anexosForRow(row)}
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

      {useMultiAmbiente && anexosGerais.length > 0 ? (
        <section className="rounded-sm border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs font-medium text-amber-900">
            {t("os.ambientes.orphanPhotosHint")}
          </p>
          <VisitPhotoGrid
            anexos={anexosGerais}
            disabled={disabled || pending}
            onRemove={removerAnexo}
          />
        </section>
      ) : null}

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
        <div className="mt-3 border-t border-cc-border/60 pt-3">
          <OsCoatingCheckbox
            ordemId={ordem.id}
            checked={coating}
            disabled={disabled || pending}
            onChange={salvarCoating}
          />
        </div>
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
