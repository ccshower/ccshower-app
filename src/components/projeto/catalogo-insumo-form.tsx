"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";

import {
  criarCatalogoItem,
  importarCatalogoCsv,
  type CatalogoActionResult,
} from "@/app/estoque/actions";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

const btnPrimary =
  "inline-flex w-full items-center justify-center rounded-sm bg-cc-ink px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet transition hover:bg-cc-deep disabled:opacity-60";

const btnSecondary =
  "inline-flex items-center justify-center rounded-sm border border-cc-border bg-white px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-cc-ink transition hover:bg-cc-canvas disabled:opacity-60";

function ResultBanner({ result }: { result: CatalogoActionResult | null }) {
  if (!result) return null;

  if (!result.ok) {
    return (
      <div className="space-y-2 rounded-sm border border-cc-red-soft bg-cc-red-soft p-4 text-sm text-cc-red">
        <p>{result.message}</p>
        {result.warnings?.map((w) => (
          <p key={w} className="text-xs">
            {w}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-sm border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <p>
        Import complete: {result.created} new, {result.updated}{" "}
        updated.
      </p>
      {result.warnings.map((w) => (
        <p key={w} className="text-xs text-amber-800">
          {w}
        </p>
      ))}
    </div>
  );
}

export function CatalogoInsumoForm({
  embedded = false,
  onBack,
  onSaved,
}: {
  embedded?: boolean;
  onBack?: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [manualResult, setManualResult] = useState<CatalogoActionResult | null>(
    null,
  );
  const [csvResult, setCsvResult] = useState<CatalogoActionResult | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [manualPending, startManualTransition] = useTransition();
  const [csvPending, startCsvTransition] = useTransition();

  function onManualSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startManualTransition(async () => {
      setManualResult(null);
      const result = await criarCatalogoItem(formData);
      setManualResult(result);
      if (result.ok) {
        e.currentTarget.reset();
        onSaved?.();
        if (!embedded) router.refresh();
      }
    });
  }

  function onCsvSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setCsvResult(null);

    const formData = new FormData();
    formData.set("arquivo", file);

    startCsvTransition(async () => {
      const result = await importarCatalogoCsv(formData);
      setCsvResult(result);
      if (result.ok) {
        onSaved?.();
        if (!embedded) router.refresh();
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        {!embedded ? (
          <div>
            <h1 className="font-display text-2xl font-light tracking-tight text-cc-ink">
              New item
            </h1>
            <p className="mt-1 text-sm font-light text-cc-muted">
              Add an item or import several via CSV.
            </p>
          </div>
        ) : (
          <p className="text-sm font-light text-cc-muted">
            Add an item or import several via CSV.
          </p>
        )}
        {embedded && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted hover:text-cc-ink"
          >
            ← Back
          </button>
        ) : (
          <Link
            href="/estoque"
            className="shrink-0 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted hover:text-cc-ink"
          >
            ← Back
          </Link>
        )}
      </div>

      <section className="rounded-ds-lg border border-cc-border bg-white p-4 shadow-sheet sm:p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted">
          Manual entry
        </h2>

        <form onSubmit={onManualSubmit} className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-cc-muted">Name *</span>
            <input
              name="nome"
              required
              placeholder="E.g. Aluminum Profile"
              className={inputClass}
              disabled={manualPending}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1 sm:col-span-1">
              <span className="text-xs font-medium text-cc-muted">Category</span>
              <input
                name="categoria"
                placeholder="E.g. Profile"
                className={inputClass}
                disabled={manualPending}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-cc-muted">Unit</span>
              <input
                name="unidade"
                placeholder="un, m, kit…"
                defaultValue="un"
                className={inputClass}
                disabled={manualPending}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-cc-muted">Quantity</span>
              <input
                name="quantidade"
                type="text"
                inputMode="decimal"
                placeholder="0"
                defaultValue="0"
                className={inputClass}
                disabled={manualPending}
              />
            </label>
          </div>

          <button type="submit" className={btnPrimary} disabled={manualPending}>
            {manualPending ? "Saving…" : "Add item"}
          </button>
        </form>

        <div className="mt-4">
          <ResultBanner result={manualResult} />
        </div>
      </section>

      <section className="rounded-ds-lg border border-cc-border bg-white p-4 shadow-sheet sm:p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted">
          Import CSV
        </h2>
        <p className="mt-2 text-sm font-light text-cc-muted">
          Columns: <strong className="font-medium text-cc-ink">nome</strong>,{" "}
          <strong className="font-medium text-cc-ink">categoria</strong>,{" "}
          <strong className="font-medium text-cc-ink">unidade</strong>,{" "}
          <strong className="font-medium text-cc-ink">quantidade</strong> (optional).
          Accepts comma or semicolon separators.
        </p>

        <pre className="mt-3 overflow-x-auto rounded-sm bg-cc-canvas px-3 py-2 text-xs text-cc-muted">
{`nome,categoria,unidade,quantidade
Stainless Pull,Hardware,un,12
Aluminum Profile,Profile,m,50`}
        </pre>

        <div className="mt-4 space-y-3">
          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-ds-lg border-2 border-dashed px-4 py-8 transition ${
              csvPending
                ? "border-violet-300 bg-violet-50/50"
                : "border-cc-border bg-cc-canvas hover:border-violet-300 hover:bg-violet-50/30"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={csvPending}
              onChange={onCsvSelected}
            />
            <span className="text-sm font-medium text-cc-ink">
              {csvPending
                ? "Importing…"
                : "Tap to choose the .csv file"}
            </span>
            <span className="mt-1 text-xs text-cc-muted">
              Import starts automatically after you select the file.
            </span>
            {csvFileName ? (
              <span className="mt-2 text-xs font-medium text-violet-700">
                {csvFileName}
              </span>
            ) : null}
          </label>

          <button
            type="button"
            className={btnSecondary}
            disabled={csvPending}
            onClick={() => fileRef.current?.click()}
          >
            Select CSV
          </button>
        </div>

        <div className="mt-4">
          <ResultBanner result={csvResult} />
        </div>
      </section>
    </div>
  );
}
