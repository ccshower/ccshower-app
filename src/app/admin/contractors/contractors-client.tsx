"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  atualizarContractor,
  criarContractor,
  setContractorAtivo,
  type ActionResult,
} from "@/app/admin/contractors/actions";
import { OperationalModal } from "@/components/operacional/operational-modal";
import { Field } from "@/components/ui/field";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { IconPencil, IconPower } from "@/components/ui/icons";
import { t } from "@/lib/i18n";
import type { Contractor } from "@/lib/types/database";

function ContractorForm({
  contractor,
  pending,
  onCancel,
  onSubmit,
}: {
  contractor?: Contractor | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      {contractor ? <input type="hidden" name="id" value={contractor.id} /> : null}
      <Field label={t("clientes.contractor.nameLabel")}>
        <input
          name="nome"
          required
          defaultValue={contractor?.nome ?? ""}
          className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
        />
      </Field>
      <Field label={t("os.workspace.phone")} hint="Optional">
        <input
          name="telefone"
          defaultValue={contractor?.telefone ?? ""}
          className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
        />
      </Field>
      <Field label={t("os.workspace.email")} hint="Optional">
        <input
          name="email"
          type="text"
          inputMode="email"
          defaultValue={contractor?.email ?? ""}
          className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
        />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted hover:bg-cc-border-light"
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
  );
}

export function ContractorsClient({
  initial,
  embedded = false,
}: {
  initial: Contractor[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  const apply = useCallback(
    (r: ActionResult) => {
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      setMsg(null);
      setOpenCreate(false);
      setEditing(null);
      router.refresh();
    },
    [router],
  );

  return (
    <div className={embedded ? "" : "space-y-4"}>
      {!embedded ? (
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-light text-cc-ink">
              {t("clientes.contractor.adminTitle")}
            </h1>
            <p className="mt-1 text-sm font-light text-cc-muted">
              {t("clientes.contractor.adminHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenCreate(true)}
            className="rounded-sm bg-cc-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-cc-deep"
          >
            {t("clientes.contractor.add")}
          </button>
        </header>
      ) : (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setOpenCreate(true)}
            className="rounded-sm bg-cc-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-cc-deep"
          >
            {t("clientes.contractor.add")}
          </button>
        </div>
      )}

      {msg ? (
        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
          {msg}
        </p>
      ) : null}

      <ul className="divide-y divide-cc-border rounded-ds-lg border border-cc-border bg-white">
        {rows.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-cc-muted">
            {t("clientes.contractor.empty")}
          </li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className={`flex items-center justify-between gap-3 px-4 py-3 ${!row.ativo ? "opacity-50" : ""}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-cc-ink">{row.nome}</p>
                {row.telefone ? (
                  <p className="text-xs text-cc-muted">{row.telefone}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <IconActionButton
                  label="Edit"
                  onClick={() => setEditing(row)}
                >
                  <IconPencil />
                </IconActionButton>
                <IconActionButton
                  label={row.ativo ? "Deactivate" : "Activate"}
                  onClick={() => {
                    startTransition(async () => {
                      apply(await setContractorAtivo(row.id, !row.ativo));
                      setRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id ? { ...r, ativo: !row.ativo } : r,
                        ),
                      );
                    });
                  }}
                >
                  <IconPower />
                </IconActionButton>
              </div>
            </li>
          ))
        )}
      </ul>

      <OperationalModal
        open={openCreate}
        title={t("clientes.contractor.add")}
        onClose={() => setOpenCreate(false)}
      >
        <ContractorForm
          pending={pending}
          onCancel={() => setOpenCreate(false)}
          onSubmit={(fd) => {
            startTransition(async () => apply(await criarContractor(fd)));
          }}
        />
      </OperationalModal>

      <OperationalModal
        open={editing != null}
        title={t("clientes.contractor.edit")}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <ContractorForm
            contractor={editing}
            pending={pending}
            onCancel={() => setEditing(null)}
            onSubmit={(fd) => {
              startTransition(async () => apply(await atualizarContractor(fd)));
            }}
          />
        ) : null}
      </OperationalModal>
    </div>
  );
}
