"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { Field } from "@/components/ui/field";
import { OperationalModal } from "@/components/operacional/operational-modal";
import type { Equipe, Unidade, UsuarioWithEquipe, TipoUsuario } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";

import {
  atualizarUsuario,
  criarUsuario,
  setUsuarioAtivo,
  type ActionResult,
} from "./actions";

const USER_PERMISSION_FIELDS = [
  { name: "pode_editar_agenda", label: "Edit schedule" },
  { name: "pode_ver_todas_equipes", label: "View all teams" },
  { name: "pode_gerenciar_estoque", label: "Manage inventory" },
  { name: "pode_resolver_crash", label: "Resolve operational blocks" },
] as const;

function mergeUserRows(
  rows: UsuarioWithEquipe[],
  row: UsuarioWithEquipe,
  equipes: Equipe[],
  unidades: Unidade[],
): UsuarioWithEquipe[] {
  const eq = row.equipe_id
    ? equipes.find((e) => e.id === row.equipe_id)
    : undefined;
  const un = row.unidade_id
    ? unidades.find((u) => u.id === row.unidade_id)
    : undefined;
  const merged: UsuarioWithEquipe = {
    ...row,
    equipe: eq
      ? {
          id: eq.id,
          nome: eq.nome,
          cor_primaria: eq.cor_primaria,
          cor_secundaria: eq.cor_secundaria,
        }
      : null,
    unidade: un ? { id: un.id, nome: un.nome, matriz: un.matriz } : null,
  };
  const idx = rows.findIndex((r) => r.id === merged.id);
  if (idx === -1) {
    return [...rows, merged].sort((a, b) => a.nome.localeCompare(b.nome));
  }
  const next = [...rows];
  next[idx] = merged;
  return next.sort((a, b) => a.nome.localeCompare(b.nome));
}

function PermCell({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${
        on ? "bg-cc-blue-soft text-cc-blue-deep" : "text-cc-muted"
      }`}
    >
      {label}: {on ? "yes" : "no"}
    </span>
  );
}

const PAGE_SIZE = 15;

type SortKey = "nome" | "equipe";

function tipoUsuarioBadgeClass(tipo: TipoUsuario): string {
  switch (tipo) {
    case "admin":
      return "bg-cc-rose-soft text-cc-rose-deep";
    case "manager":
      return "bg-violet-100 text-violet-800";
    default:
      return "bg-cc-border-light text-cc-muted";
  }
}

export function UsuariosClient({
  initial,
  equipes,
  unidades,
  embedded = false,
}: {
  initial: UsuarioWithEquipe[];
  equipes: Equipe[];
  unidades: Unidade[];
  /** Oculta o título de página quando renderizado dentro de um modal. */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [eqState, setEqState] = useState(equipes);
  const [openCreate, setOpenCreate] = useState(false);
  const [createNonce, setCreateNonce] = useState(0);
  const [editing, setEditing] = useState<UsuarioWithEquipe | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const eqRef = useRef(equipes);
  const unRef = useRef(unidades);

  useEffect(() => {
    unRef.current = unidades;
  }, [unidades]);

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  useEffect(() => {
    setEqState(equipes);
  }, [equipes]);

  useEffect(() => {
    eqRef.current = eqState;
  }, [eqState]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const toggleSort = useCallback((key: SortKey) => {
    setPage(1);
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }, [sortKey]);

  const displayRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...rows];
    if (q) {
      list = list.filter((u) => {
        const nom = u.nome.toLowerCase();
        const em = u.email.toLowerCase();
        const tel = (u.telefone ?? "").toLowerCase();
        const eq = (u.equipe?.nome ?? "").toLowerCase();
        const un = (u.unidade?.nome ?? "").toLowerCase();
        return (
          nom.includes(q) ||
          em.includes(q) ||
          tel.includes(q) ||
          eq.includes(q) ||
          un.includes(q)
        );
      });
    }
    list.sort((a, b) => {
      if (sortKey === "nome") {
        const c = a.nome.localeCompare(b.nome, "pt-BR");
        return sortDir === "asc" ? c : -c;
      }
      const an = a.equipe?.nome ?? "";
      const bn = b.equipe?.nome ?? "";
      const c = an.localeCompare(bn, "pt-BR");
      return sortDir === "asc" ? c : -c;
    });
    return list;
  }, [rows, search, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const paginated = useMemo(() => {
    const p = Math.min(Math.max(1, page), pageCount);
    const start = (p - 1) * PAGE_SIZE;
    return displayRows.slice(start, start + PAGE_SIZE);
  }, [displayRows, page, pageCount]);

  const rangeStart =
    displayRows.length === 0 ? 0 : (Math.min(page, pageCount) - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(
    displayRows.length,
    (Math.min(page, pageCount) - 1) * PAGE_SIZE + paginated.length,
  );

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
    const chUsers = supabase
      .channel("usuarios-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "usuarios" },
        (payload) => {
          if (payload.eventType === "DELETE" && payload.old?.id) {
            setRows((prev) => prev.filter((x) => x.id !== payload.old.id));
            return;
          }
          const raw = payload.new as UsuarioWithEquipe | undefined;
          if (!raw?.id) return;
          setRows((prev) => mergeUserRows(prev, raw, eqRef.current, unRef.current));
        },
      )
      .subscribe();

    const chTeams = supabase
      .channel("equipes-realtime-usuarios")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipes" },
        (payload) => {
          const row = payload.new as Equipe | undefined;
          if (!row?.id) return;
          setEqState((prev) => {
            const idx = prev.findIndex((e) => e.id === row.id);
            if (idx === -1) return [...prev, row].sort((a, b) => a.nome.localeCompare(b.nome));
            const next = [...prev];
            next[idx] = row;
            return next.sort((a, b) => a.nome.localeCompare(b.nome));
          });
          setRows((prev) =>
            prev.map((u) =>
              u.equipe_id === row.id
                ? {
                    ...u,
                    equipe: {
                      id: row.id,
                      nome: row.nome,
                      cor_primaria: row.cor_primaria,
                      cor_secundaria: row.cor_secundaria,
                    },
                  }
                : u,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(chUsers);
      void supabase.removeChannel(chTeams);
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
              Users
            </h1>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setCreateNonce((n) => n + 1);
            setOpenCreate(true);
          }}
          className="inline-flex items-center justify-center rounded-sm bg-cc-ink px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet transition hover:bg-cc-deep hover:shadow-lift"
        >
          New user
        </button>
      </div>

      <div className="max-w-md">
        <label className="sr-only" htmlFor="busca-usuarios">
          Search users
        </label>
        <input
          id="busca-usuarios"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone, team, or unit…"
          className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus"
        />
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
        <table className="min-w-[720px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-cc-border bg-cc-border-light text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
              <th className="px-3 py-2 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort("nome")}
                  className="inline-flex items-center gap-1 font-medium text-cc-muted hover:text-cc-ink"
                  aria-sort={
                    sortKey === "nome"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  Name
                  {sortKey === "nome" ? (
                    <span className="text-[10px] font-normal normal-case">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  ) : null}
                </button>
              </th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort("equipe")}
                  className="inline-flex items-center gap-1 font-medium text-cc-muted hover:text-cc-ink"
                  aria-sort={
                    sortKey === "equipe"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  Team
                  {sortKey === "equipe" ? (
                    <span className="text-[10px] font-normal normal-case">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  ) : null}
                </button>
              </th>
              <th className="px-3 py-2 font-medium">Unit</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Permissions</th>
              <th className="px-3 py-2 font-medium">Active</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((u) => (
              <tr key={u.id} className="border-b border-cc-border last:border-0 align-top">
                <td className="px-3 py-2 font-medium text-cc-ink">{u.nome}</td>
                <td className="px-3 py-2 text-cc-muted break-all">{u.email}</td>
                <td className="px-3 py-2 text-cc-muted">{u.telefone ?? "—"}</td>
                <td className="px-3 py-2">
                  {u.equipe ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-cc-border"
                        style={{ background: u.equipe.cor_primaria }}
                      />
                      <span className="text-cc-deep">{u.equipe.nome}</span>
                    </span>
                  ) : (
                    <span className="text-cc-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {u.unidade ? (
                    <span className="inline-flex items-center gap-1.5 text-cc-deep">
                      {u.unidade.nome}
                      {u.unidade.matriz ? (
                        <span className="rounded bg-cc-border-light px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-cc-muted">
                          HQ
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-cc-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${tipoUsuarioBadgeClass(
                      u.tipo_usuario,
                    )}`}
                  >
                    {u.tipo_usuario}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1 max-w-[220px]">
                    <PermCell label="Agenda" on={u.pode_editar_agenda} />
                    <PermCell label="Teams" on={u.pode_ver_todas_equipes} />
                    <PermCell label="Inventory" on={u.pode_gerenciar_estoque} />
                    <PermCell label="Crash" on={u.pode_resolver_crash} />
                  </div>
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
                <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
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
                        const r = await setUsuarioAtivo(u.id, !u.ativo);
                        applyResult(r);
                      })
                    }
                  >
                    {u.ativo ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-sm text-cc-muted">
                  {rows.length === 0
                    ? "No users registered."
                    : "No search results."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {displayRows.length > 0 ? (
        <div className="flex flex-col gap-2 text-sm text-cc-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            {rangeStart}–{rangeEnd} of {displayRows.length}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-sm border border-cc-border bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-[0.06em] text-cc-deep transition hover:bg-cc-border-light disabled:pointer-events-none disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs tabular-nums">
              Page {Math.min(page, pageCount)} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="rounded-sm border border-cc-border bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-[0.06em] text-cc-deep transition hover:bg-cc-border-light disabled:pointer-events-none disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <OperationalModal
        open={openCreate}
        title="New user"
        onClose={() => setOpenCreate(false)}
      >
        <UserForm
          key={`create-${createNonce}`}
          equipes={eqState}
          unidades={unidades}
          mode="create"
          pending={pending}
          onSubmit={(fd) =>
            startTransition(async () => {
              const r = await criarUsuario(fd);
              applyResult(r);
              if (r.ok) setOpenCreate(false);
            })
          }
          onCancel={() => setOpenCreate(false)}
        />
      </OperationalModal>

      <OperationalModal
        open={!!editing}
        title="Edit user"
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <UserForm
            key={editing.id}
            equipes={eqState}
            unidades={unidades}
            mode="edit"
            initial={editing}
            pending={pending}
            onSubmit={(fd) =>
              startTransition(async () => {
                const r = await atualizarUsuario(fd);
                applyResult(r);
                if (r.ok) setEditing(null);
              })
            }
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </OperationalModal>
    </div>
  );
}

function UserForm({
  mode,
  equipes,
  unidades,
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  equipes: Equipe[];
  unidades: Unidade[];
  initial?: UsuarioWithEquipe;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  const matrizId = unidades.find((u) => u.matriz)?.id ?? "";
  const unidadeDefault = initial?.unidade_id ?? matrizId;
  return (
    <form
      className="space-y-3"
      onSubmit={(ev) => {
        ev.preventDefault();
        onSubmit(new FormData(ev.currentTarget));
      }}
    >
      {mode === "edit" && initial ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

      <Field label="Name">
        <input
          name="nome"
          required
          defaultValue={initial?.nome}
          className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
        />
      </Field>

      <Field label="Email">
        <input
          name="email"
          type="email"
          required
          autoComplete="off"
          defaultValue={initial?.email}
          className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
        />
      </Field>

      <Field
        label={mode === "create" ? "Password" : "New password (optional)"}
        hint={
          mode === "create"
            ? "Minimum 6 characters."
            : "Leave blank to keep the current password."
        }
      >
        <input
          name="password"
          type="password"
          required={mode === "create"}
          autoComplete="new-password"
          className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
        />
      </Field>

      <Field label="Phone">
        <input
          name="telefone"
          type="tel"
          defaultValue={initial?.telefone ?? ""}
          className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
          placeholder="+1 …"
        />
      </Field>

      <Field label="Team">
        <select
          name="equipe_id"
          defaultValue={initial?.equipe_id ?? ""}
          className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
        >
          <option value="">No team</option>
          {equipes.map((e) => (
            <option key={e.id} value={e.id} disabled={!e.ativo}>
              {e.nome}
              {!e.ativo ? " (inactive)" : ""}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Unit">
        <select
          name="unidade_id"
          defaultValue={unidadeDefault}
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

      <Field label="User type">
        <select
          name="tipo_usuario"
          defaultValue={initial?.tipo_usuario ?? "comum"}
          className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
        >
          <option value="comum">standard</option>
          <option value="manager">manager</option>
          <option value="admin">admin</option>
        </select>
        <p className="mt-1 text-xs text-cc-muted">
          manager — operational manager: sees all teams; admin registrations are admin-only.
        </p>
      </Field>

      <fieldset className="space-y-2 rounded-sm border-[1.5px] border-cc-border px-3 py-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep">
          Permissions
        </legend>
        {USER_PERMISSION_FIELDS.map(({ name, label }) => (
          <label
            key={name}
            className="flex items-center gap-2 text-sm font-light text-cc-deep"
          >
            <input
              type="checkbox"
              name={name}
              defaultChecked={initial?.[name]}
              className="h-4 w-4 rounded-sm border-[1.5px] border-cc-border-strong accent-cc-blue"
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          className="rounded-sm px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted hover:bg-cc-border-light"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-sm bg-cc-ink px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet hover:bg-cc-deep disabled:opacity-40"
        >
          {mode === "create" ? "Create" : "Save"}
        </button>
      </div>
    </form>
  );
}
