"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { Field } from "@/components/ui/field";
import { OperationalModal } from "@/components/operacional/operational-modal";
import {
  inferOperationalStageFromTeamName,
  operationalStageLabel,
  operationalStageOptions,
  parseOperationalStageCode,
} from "@/lib/equipes/operational-stage-options";
import type { Equipe, Unidade, UsuarioWithEquipe } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";

import {
  atualizarEquipe,
  criarEquipe,
  setEquipeAtivo,
  type ActionResult,
} from "./actions";

function mergeRealtimeRow(rows: Equipe[], row: Equipe): Equipe[] {
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx === -1) return [...rows, row].sort((a, b) => a.nome.localeCompare(b.nome));
  const next = [...rows];
  next[idx] = row;
  return next.sort((a, b) => a.nome.localeCompare(b.nome));
}

function buildUsuariosPorEquipe(
  usuarios: Pick<UsuarioWithEquipe, "nome" | "equipe_id" | "ativo">[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const usuario of usuarios) {
    if (!usuario.equipe_id || !usuario.ativo) continue;
    const list = map.get(usuario.equipe_id) ?? [];
    list.push(usuario.nome);
    map.set(usuario.equipe_id, list);
  }
  for (const [, names] of map) {
    names.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }
  return map;
}

function EquipeNomeComMembros({
  nome,
  membros,
}: {
  nome: string;
  membros: string[];
}) {
  return (
    <span className="group/equipe relative inline-block max-w-full cursor-help">
      <span className="truncate font-medium text-cc-ink underline decoration-dotted decoration-cc-border-strong underline-offset-[3px]">
        {nome}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-20 mt-1.5 hidden min-w-[10rem] max-w-[14rem] rounded-ds-lg border border-cc-border bg-cc-surface px-3 py-2 shadow-lift group-hover/equipe:block"
      >
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted">
          Users
        </span>
        {membros.length > 0 ? (
          <ul className="space-y-0.5 text-xs text-cc-deep">
            {membros.map((membro) => (
              <li key={membro}>{membro}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-cc-muted">No linked users</p>
        )}
      </span>
    </span>
  );
}

function OperationalStageSelect({
  name = "codigo_operacional",
  defaultValue,
  required = true,
}: {
  name?: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  const options = operationalStageOptions();
  const parsed = parseOperationalStageCode(defaultValue);

  return (
    <Field
      label="Operational stage"
      hint="Defines which workflow step this team handles (Commercial, Financial, Project, Installation). Multiple teams can share the same stage — e.g. Commercial and SALES both use Commercial."
    >
      <select
        name={name}
        required={required}
        defaultValue={parsed ?? ""}
        className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
      >
        <option value="" disabled>
          Select stage…
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function OperationalStageBadge({ code }: { code: string | null | undefined }) {
  const parsed = parseOperationalStageCode(code);
  if (!parsed) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Not set
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-cc-blue-soft px-2 py-0.5 text-xs font-medium text-cc-blue-deep">
      {operationalStageLabel(parsed)}
    </span>
  );
}

export function EquipesClient({
  initial,
  unidades,
  usuarios = [],
  embedded = false,
}: {
  initial: Equipe[];
  unidades: Unidade[];
  usuarios?: Pick<UsuarioWithEquipe, "nome" | "equipe_id" | "ativo">[];
  /** Oculta o título de página quando renderizado dentro de um modal. */
  embedded?: boolean;
}) {
  const unidadeById = useMemo(
    () => new Map(unidades.map((u) => [u.id, u])),
    [unidades],
  );
  const matrizId = unidades.find((u) => u.matriz)?.id ?? "";
  const usuariosPorEquipe = useMemo(() => buildUsuariosPorEquipe(usuarios), [usuarios]);
  const router = useRouter();
  const [rows, setRows] = useState<Equipe[]>(initial);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Equipe | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  const applyResult = useCallback((r: ActionResult) => {
    if (!r.ok) {
      setMsg(r.message);
      return;
    }
    setMsg(null);
    router.refresh();
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("equipes-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipes" },
        (payload) => {
          if (payload.eventType === "DELETE" && payload.old?.id) {
            setRows((prev) => prev.filter((x) => x.id !== payload.old.id));
            return;
          }
          const row = payload.new as Equipe | undefined;
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
              Teams
            </h1>
            <p className="mt-1 text-sm font-light text-cc-muted">
              Team colors and operational stage for workflow routing (commercial, project, etc.).
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center justify-center rounded-sm bg-cc-ink px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet transition hover:bg-cc-deep hover:shadow-lift"
        >
          New team
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
              <th className="px-3 py-2 font-medium">Operational stage</th>
              <th className="px-3 py-2 font-medium">Colors</th>
              <th className="px-3 py-2 font-medium">Unit</th>
              <th className="px-3 py-2 font-medium">Active</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-b border-cc-border last:border-0">
                <td className="px-3 py-2">
                  <EquipeNomeComMembros
                    nome={e.nome}
                    membros={usuariosPorEquipe.get(e.id) ?? []}
                  />
                </td>
                <td className="px-3 py-2">
                  <OperationalStageBadge code={e.codigo_operacional} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-5 w-5 rounded border border-cc-border"
                      style={{ background: e.cor_primaria }}
                      title={e.cor_primaria}
                    />
                    <span
                      className="h-5 w-5 rounded border border-cc-border"
                      style={{ background: e.cor_secundaria }}
                      title={e.cor_secundaria}
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  {(() => {
                    const un = e.unidade_id ? unidadeById.get(e.unidade_id) : undefined;
                    if (!un) return <span className="text-cc-muted">—</span>;
                    return (
                      <span className="inline-flex items-center gap-1.5 text-cc-deep">
                        {un.nome}
                        {un.matriz ? (
                          <span className="rounded bg-cc-border-light px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-cc-muted">
                            HQ
                          </span>
                        ) : null}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.ativo
                        ? "bg-cc-blue-soft text-cc-blue-deep"
                        : "bg-cc-border-light text-cc-muted"
                    }`}
                  >
                    {e.ativo ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    className="text-sm font-medium text-cc-blue underline-offset-2 hover:text-cc-blue-deep hover:underline"
                    onClick={() => setEditing(e)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-sm font-medium text-cc-muted hover:text-cc-ink"
                    onClick={() =>
                      startTransition(async () => {
                        const r = await setEquipeAtivo(e.id, !e.ativo);
                        applyResult(r);
                      })
                    }
                  >
                    {e.ativo ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-cc-muted">
                  No teams registered.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <OperationalModal
        open={openCreate}
        title="New team"
        onClose={() => setOpenCreate(false)}
      >
        <form
          className="space-y-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            const fd = new FormData(ev.currentTarget);
            startTransition(async () => {
              const r = await criarEquipe(fd);
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
          <OperationalStageSelect />
          <Field label="Unit">
            <select
              name="unidade_id"
              defaultValue={matrizId}
              className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                  {u.matriz ? " (HQ)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Primary color">
              <input
                name="cor_primaria"
                type="color"
                defaultValue="#7189a8"
                className="h-10 w-full cursor-pointer rounded-sm border-[1.5px] border-cc-border bg-white"
              />
            </Field>
            <Field label="Secondary color">
              <input
                name="cor_secundaria"
                type="color"
                defaultValue="#e8f0f7"
                className="h-10 w-full cursor-pointer rounded-sm border-[1.5px] border-cc-border bg-white"
              />
            </Field>
          </div>
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
        title="Edit team"
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <form
            key={editing.id}
            className="space-y-3"
            onSubmit={(ev) => {
              ev.preventDefault();
              const fd = new FormData(ev.currentTarget);
              startTransition(async () => {
                const r = await atualizarEquipe(fd);
                applyResult(r);
                if (r.ok) setEditing(null);
              });
            }}
          >
            <input type="hidden" name="id" value={editing.id} />
            <Field label="Name">
              <input
                name="nome"
                required
                defaultValue={editing.nome}
                className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
              />
            </Field>
            <OperationalStageSelect
              defaultValue={
                editing.codigo_operacional ??
                inferOperationalStageFromTeamName(editing.nome)
              }
            />
            <Field label="Unit">
              <select
                name="unidade_id"
                defaultValue={editing.unidade_id ?? matrizId}
                className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
              >
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                    {u.matriz ? " (HQ)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary color">
                <input
                  name="cor_primaria"
                  type="color"
                  defaultValue={editing.cor_primaria}
                  className="h-10 w-full cursor-pointer rounded-sm border-[1.5px] border-cc-border bg-white"
                />
              </Field>
              <Field label="Secondary color">
                <input
                  name="cor_secundaria"
                  type="color"
                  defaultValue={editing.cor_secundaria}
                  className="h-10 w-full cursor-pointer rounded-sm border-[1.5px] border-cc-border bg-white"
                />
              </Field>
            </div>
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
