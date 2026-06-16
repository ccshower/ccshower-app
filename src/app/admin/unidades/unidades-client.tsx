"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import {
  atualizarUnidade,
  criarUnidade,
  setUnidadeAtivo,
  type ActionResult,
} from "@/app/admin/unidades/actions";
import { Field } from "@/components/ui/field";
import { OperationalModal } from "@/components/operacional/operational-modal";
import { createClient } from "@/lib/supabase/client";
import { formatProducaoValor } from "@/lib/centro-operacional/producao-mensal";
import type { Unidade } from "@/lib/types/database";

const TIMEZONE_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
];

function mergeRealtimeRow(rows: Unidade[], row: Unidade): Unidade[] {
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx === -1) {
    return [...rows, row].sort((a, b) => {
      if (a.matriz !== b.matriz) return a.matriz ? -1 : 1;
      return a.nome.localeCompare(b.nome);
    });
  }
  const next = [...rows];
  next[idx] = row;
  return next.sort((a, b) => {
    if (a.matriz !== b.matriz) return a.matriz ? -1 : 1;
    return a.nome.localeCompare(b.nome);
  });
}

export function UnidadesClient({
  initial,
  embedded = false,
}: {
  initial: Unidade[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Unidade[]>(initial);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Unidade | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  const applyResult = useCallback(
    (r: ActionResult) => {
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      setMsg(null);
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("unidades-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "unidades" },
        (payload) => {
          if (payload.eventType === "DELETE" && payload.old?.id) {
            setRows((prev) => prev.filter((x) => x.id !== payload.old.id));
            return;
          }
          const row = payload.new as Unidade | undefined;
          if (!row?.id) return;
          setRows((prev) => mergeRealtimeRow(prev, row));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const busyLabel = useMemo(() => (pending ? "Saving…" : null), [pending]);

  return (
    <div className="space-y-4">
      <div
        className={`flex flex-col gap-2 sm:flex-row sm:items-end ${
          embedded ? "sm:justify-end" : "sm:justify-between"
        }`}
      >
        {!embedded ? (
          <div>
            <h1 className="font-display text-2xl font-light tracking-tight text-cc-ink">
              Units
            </h1>
            <p className="mt-1 text-sm font-light text-cc-muted">
              Business locations used across clients, teams, and work orders.
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center justify-center rounded-sm bg-cc-ink px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet transition hover:bg-cc-deep hover:shadow-lift"
        >
          New unit
        </button>
      </div>

      {msg ? (
        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm font-medium text-cc-red">
          {msg}
        </p>
      ) : null}
      {busyLabel ? (
        <p className="flex items-center gap-2 text-xs text-cc-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-cc-blue" />
          {busyLabel}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-ds-lg border border-cc-border bg-cc-surface shadow-sheet">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-cc-border bg-cc-border-light text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Monthly goal</th>
              <th className="px-3 py-2 font-medium">Timezone</th>
              <th className="px-3 py-2 font-medium">HQ</th>
              <th className="px-3 py-2 font-medium">Active</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-cc-border last:border-0">
                <td className="px-3 py-2 font-medium text-cc-ink">{u.nome}</td>
                <td className="px-3 py-2 tabular-nums text-cc-deep">
                  {formatProducaoValor(u.meta_producao_mensal ?? 0)}
                </td>
                <td className="px-3 py-2 text-cc-deep">{u.timezone}</td>
                <td className="px-3 py-2">
                  {u.matriz ? (
                    <span className="inline-flex rounded-full bg-cc-blue-soft px-2 py-0.5 text-xs font-medium text-cc-blue-deep">
                      HQ
                    </span>
                  ) : (
                    <span className="text-cc-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.ativo
                        ? "bg-cc-blue-soft text-cc-blue-deep"
                        : "bg-cc-border-light text-cc-muted"
                    }`}
                  >
                    {u.ativo ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="space-x-2 whitespace-nowrap px-3 py-2 text-right">
                  <button
                    type="button"
                    className="text-sm font-medium text-cc-blue underline-offset-2 hover:text-cc-blue-deep hover:underline"
                    onClick={() => setEditing(u)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-sm font-medium text-cc-muted hover:text-cc-ink"
                    onClick={() =>
                      startTransition(async () => {
                        const r = await setUnidadeAtivo(u.id, !u.ativo);
                        applyResult(r);
                      })
                    }
                  >
                    {u.ativo ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-cc-muted">
                  No units registered.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <OperationalModal
        open={openCreate}
        title="New unit"
        onClose={() => setOpenCreate(false)}
      >
        <form
          className="space-y-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            const fd = new FormData(ev.currentTarget);
            startTransition(async () => {
              const r = await criarUnidade(fd);
              applyResult(r);
              if (r.ok) setOpenCreate(false);
            });
          }}
        >
          <Field label="Name">
            <input
              name="nome"
              required
              className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
            />
          </Field>
          <Field label="Monthly production goal">
            <input
              name="meta_producao_mensal"
              type="number"
              min="0"
              step="1000"
              defaultValue={250000}
              required
              className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
            />
          </Field>
          <Field label="Timezone">
            <select
              name="timezone"
              defaultValue="America/New_York"
              className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="rounded-sm px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted hover:bg-cc-border-light"
              onClick={() => setOpenCreate(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-sm bg-cc-ink px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet hover:bg-cc-deep disabled:opacity-40"
            >
              Create
            </button>
          </div>
        </form>
      </OperationalModal>

      <OperationalModal
        open={!!editing}
        title="Edit unit"
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.currentTarget);
              fd.set("id", editing.id);
              startTransition(async () => {
                const r = await atualizarUnidade(fd);
                applyResult(r);
                if (r.ok) setEditing(null);
              });
            }}
          >
            <Field label="Name">
              <input
                name="nome"
                required
                defaultValue={editing.nome}
                className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
              />
            </Field>
            <Field label="Monthly production goal">
              <input
                name="meta_producao_mensal"
                type="number"
                min="0"
                step="1000"
                defaultValue={editing.meta_producao_mensal ?? 250000}
                required
                className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
              />
            </Field>
            <Field label="Timezone">
              <select
                name="timezone"
                defaultValue={editing.timezone}
                className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-cc-deep">
              <input
                type="checkbox"
                name="matriz"
                defaultChecked={editing.matriz}
                className="h-4 w-4 rounded border-cc-border"
              />
              Headquarters (HQ)
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="rounded-sm px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted hover:bg-cc-border-light"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-sm bg-cc-ink px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet hover:bg-cc-deep disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </form>
        ) : null}
      </OperationalModal>
    </div>
  );
}
