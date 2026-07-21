"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { ClienteForm } from "@/components/clientes/cliente-form";
import { OperationalModal } from "@/components/operacional/operational-modal";
import { AgendarVisitaModal } from "@/components/ordens-servico/agendar-visita-modal";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { IconClipboard, IconPencil, IconPower } from "@/components/ui/icons";
import { parseClientType } from "@/lib/clientes/tipo-cliente";
import { OsSemEquipeBadge } from "@/components/ordens-servico/os-sem-equipe-badge";
import { clienteSemEquipe } from "@/lib/equipes/validate-equipe-operacional";
import { tClientType } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type {
  Cliente,
  ClienteOsResumo,
  ClienteWithRelations,
  Contractor,
  Equipe,
  Usuario,
} from "@/lib/types/database";

import { criarOrdemServicoComVisita } from "@/app/ordens-servico/actions";

import {
  atualizarCliente,
  criarCliente,
  setClienteAtivo,
  type ActionResult,
} from "./actions";

export { ClienteForm };

function mergeRealtimeRow(
  rows: ClienteWithRelations[],
  row: Cliente,
  equipes: Equipe[],
  usuarios: Usuario[],
): ClienteWithRelations[] {
  const equipe = row.equipe_id ? equipes.find((e) => e.id === row.equipe_id) : undefined;
  const merged: ClienteWithRelations = {
    ...row,
    equipe: equipe
      ? {
          id: equipe.id,
          nome: equipe.nome,
          cor_primaria: equipe.cor_primaria,
          cor_secundaria: equipe.cor_secundaria,
        }
      : null,
  };
  const idx = rows.findIndex((r) => r.id === row.id);
  const next = idx === -1 ? [merged, ...rows] : rows.map((r) => (r.id === row.id ? merged : r));
  return next.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
}

export function ClientesClient({
  initial,
  equipes,
  usuarios,
  contractors,
  initialOsPorCliente,
  osLoadWarning,
  googleMapsApiKey,
  defaultEquipeId,
  canChooseEquipe = false,
  permitirDatasRetroativas = false,
}: {
  initial: ClienteWithRelations[];
  equipes: Equipe[];
  usuarios: Usuario[];
  contractors: Contractor[];
  initialOsPorCliente: Record<string, ClienteOsResumo[]>;
  osLoadWarning?: string;
  googleMapsApiKey: string;
  defaultEquipeId: string | null;
  canChooseEquipe?: boolean;
  permitirDatasRetroativas?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ClienteWithRelations[]>(initial);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<ClienteWithRelations | null>(null);
  const [osPorCliente, setOsPorCliente] = useState(initialOsPorCliente);
  const [agendarCliente, setAgendarCliente] = useState<ClienteWithRelations | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  useEffect(() => {
    setOsPorCliente(initialOsPorCliente);
  }, [initialOsPorCliente]);

  const agendarVisita = useCallback((cliente: ClienteWithRelations) => {
    setAgendarCliente(cliente);
  }, []);

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
      .channel("clientes-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clientes" },
        (payload) => {
          if (payload.eventType === "DELETE" && payload.old?.id) {
            setRows((prev) => prev.filter((x) => x.id !== payload.old.id));
            return;
          }
          const row = payload.new as Cliente | undefined;
          if (!row?.id) return;
          setRows((prev) => mergeRealtimeRow(prev, row, equipes, usuarios));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [equipes, usuarios]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((c) =>
      [
        c.nome,
        c.telefone,
        c.email,
        c.endereco_formatado,
        c.cidade,
        c.equipe?.nome,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [query, rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-light tracking-tight text-cc-ink">
            Customers
          </h1>
          <p className="mt-1 text-sm font-light text-cc-muted">
            Operational queue — stage and team color for quick identification.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center justify-center rounded-sm bg-cc-ink px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet transition hover:bg-cc-deep hover:shadow-lift"
        >
          New customer
        </button>
      </div>

      <div className="rounded-ds-lg border border-cc-border bg-cc-surface p-3 shadow-sheet">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none transition placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus"
          placeholder="Search by name, phone, address, team..."
        />
      </div>

      {osLoadWarning ? (
        <p className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Could not load work orders ({osLoadWarning}). The operational view may
          be incomplete.
        </p>
      ) : null}
      {msg ? (
        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm font-medium text-cc-red">
          {msg}
        </p>
      ) : null}
      {pending ? (
        <p className="flex items-center gap-2 text-xs text-cc-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-cc-blue" />
          Saving...
        </p>
      ) : null}

      <div className="overflow-hidden rounded-ds-lg border border-cc-border bg-cc-surface shadow-sheet">
        <div className="hidden border-b border-cc-border bg-cc-border-light/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-cc-muted md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,0.75fr)_minmax(0,0.55fr)_auto] md:gap-4">
          <span>Customer</span>
          <span>Address</span>
          <span>Current team</span>
          <span>Operational stage</span>
          <span className="text-right">Actions</span>
        </div>
        <ul className="divide-y divide-cc-border">
          {filtered.map((c) => {
            const equipeLinha = c.equipe;
            return (
              <li
                key={c.id}
                className="group/row transition-colors hover:bg-cc-border-light/50"
              >
                <div className="flex flex-col gap-3 px-4 py-3.5 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,0.75fr)_minmax(0,0.55fr)_auto] md:items-center md:gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-cc-ink">{c.nome}</p>
                      <span className="inline-flex rounded-full bg-cc-border-light px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cc-muted">
                        {tClientType(parseClientType(c.tipo_cliente))}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-cc-muted">{c.telefone}</p>
                    {c.email ? (
                      <p className="mt-0.5 truncate text-xs text-cc-subtle">{c.email}</p>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-light leading-snug text-cc-deep line-clamp-2">
                      {c.endereco_formatado}
                    </p>
                    {c.google_maps_url ? (
                      <a
                        href={c.google_maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-xs font-medium text-cc-blue hover:text-cc-blue-deep"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Directions →
                      </a>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {equipeLinha ? (
                      <>
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full border border-cc-border"
                          style={{ background: equipeLinha.cor_primaria }}
                        />
                        <span className="text-sm text-cc-deep">{equipeLinha.nome}</span>
                      </>
                    ) : clienteSemEquipe(c) ? (
                      <OsSemEquipeBadge />
                    ) : (
                      <span className="text-sm text-cc-muted">—</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    {!c.ativo ? (
                      <span className="inline-flex rounded-full bg-cc-border-light px-2 py-0.5 text-[11px] font-medium text-cc-muted">
                        Inactive customer
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="flex items-center gap-0 md:justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconActionButton
                      variant="accent"
                      label="Schedule visit"
                      onClick={() => agendarVisita(c)}
                    >
                      <IconClipboard />
                    </IconActionButton>
                    <IconActionButton
                      label="Edit customer"
                      onClick={() => setEditing(c)}
                    >
                      <IconPencil />
                    </IconActionButton>
                    <IconActionButton
                      variant="danger"
                      label={c.ativo ? "Deactivate customer" : "Activate customer"}
                      onClick={() =>
                        startTransition(async () => {
                          applyResult(await setClienteAtivo(c.id, !c.ativo));
                        })
                      }
                    >
                      <IconPower />
                    </IconActionButton>
                  </div>
                </div>
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm font-light text-cc-muted">
              No customers found.
            </li>
          ) : null}
        </ul>
      </div>

      <OperationalModal
        open={openCreate}
        title="New customer"
        onClose={() => setOpenCreate(false)}
      >
        <ClienteForm
          key={`create-${openCreate}`}
          formKey={`create-${openCreate}`}
          equipes={equipes}
          usuarios={usuarios}
          contractors={contractors}
          apiKey={googleMapsApiKey}
          pending={pending}
          canChooseEquipe={canChooseEquipe}
          defaultEquipeId={defaultEquipeId}
          onCancel={() => setOpenCreate(false)}
          onSubmit={(fd) => {
            startTransition(async () => {
              const r = await criarCliente(fd);
              if (!r.ok) {
                applyResult(r);
                return;
              }
              setMsg(null);
              setOpenCreate(false);
              router.refresh();
            });
          }}
        />
      </OperationalModal>

      <OperationalModal
        open={!!editing}
        title="Edit customer"
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <ClienteForm
            key={editing.id}
            formKey={editing.id}
            cliente={editing}
            equipes={equipes}
            usuarios={usuarios}
            contractors={contractors}
            apiKey={googleMapsApiKey}
            pending={pending}
            canChooseEquipe={canChooseEquipe}
            defaultEquipeId={defaultEquipeId}
            onCancel={() => setEditing(null)}
            onSubmit={(fd) => {
              startTransition(async () => {
                const r = await atualizarCliente(fd);
                applyResult(r);
                if (r.ok) setEditing(null);
              });
            }}
          />
        ) : null}
      </OperationalModal>

      {agendarCliente ? (
        <AgendarVisitaModal
          open
          clienteId={agendarCliente.id}
          clienteNome={agendarCliente.nome}
          tipoCliente={parseClientType(agendarCliente.tipo_cliente)}
          equipes={equipes}
          defaultEquipeId={defaultEquipeId}
          initialEquipeId={agendarCliente.equipe_id}
          permitirDatasRetroativas={permitirDatasRetroativas}
          pending={pending}
          onClose={() => setAgendarCliente(null)}
          onSubmit={(fd) => {
            startTransition(async () => {
              const r = await criarOrdemServicoComVisita(fd);
              if (!r.ok) {
                setMsg(r.message);
                return;
              }
              setMsg(null);
              setAgendarCliente(null);
              router.refresh();
            });
          }}
        />
      ) : null}

    </div>
  );
}
