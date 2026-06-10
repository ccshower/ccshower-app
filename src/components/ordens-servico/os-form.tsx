"use client";

import { OsEquipeResponsavelFields } from "@/components/ordens-servico/os-equipe-responsavel-fields";
import { Field } from "@/components/ui/field";
import { OS_STATUS, type OrdemServicoStatus } from "@/lib/ordens-servico/constants";
import { tOsStatus } from "@/lib/i18n";
import type { Equipe, OrdemServicoWithRelations, Usuario } from "@/lib/types/database";

type ClienteOption = {
  id: string;
  nome: string;
  telefone: string;
  endereco_formatado: string;
  equipe_id: string | null;
};

type Props = {
  ordem?: OrdemServicoWithRelations | null;
  clientes: ClienteOption[];
  equipes: Equipe[];
  usuarios: Usuario[];
  defaultEquipeId: string | null;
  showStatus?: boolean;
  pending?: boolean;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: (fd: FormData) => void;
};

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none transition placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

export function OsForm({
  ordem,
  clientes,
  equipes,
  usuarios,
  defaultEquipeId,
  showStatus = false,
  pending = false,
  submitLabel,
  onCancel,
  onSubmit,
}: Props) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      {ordem ? <input type="hidden" name="id" value={ordem.id} /> : null}

      <Field label="Customer">
        <select
          name="cliente_id"
          required
          defaultValue={ordem?.cliente_id ?? ""}
          className={inputClass}
        >
          <option value="">Select a client</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} — {c.telefone}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Work order title">
        <input
          name="titulo"
          required
          defaultValue={ordem?.titulo ?? ""}
          placeholder="E.g. technical visit master bathroom"
          className={inputClass}
        />
      </Field>

      <Field label="Description">
        <textarea
          name="descricao"
          rows={3}
          defaultValue={ordem?.descricao ?? ""}
          placeholder="Operational notes"
          className={inputClass}
        />
      </Field>

      <OsEquipeResponsavelFields
        equipes={equipes}
        usuarios={usuarios}
        defaultEquipeId={defaultEquipeId}
        initialEquipeId={ordem?.equipe_atual_id ?? ordem?.equipe_id}
        initialResponsavelId={ordem?.responsavel_id}
        requireEquipe
      />

      <Field label="Estimated value (USD)">
        <input
          name="valor_previsto"
          type="number"
          min="0"
          step="0.01"
          defaultValue={
            ordem?.valor_previsto === null || ordem?.valor_previsto === undefined
              ? ""
              : String(ordem.valor_previsto)
          }
          placeholder="0.00"
          className={inputClass}
        />
      </Field>

      {showStatus ? (
        <Field label="Status">
          <select
            name="status"
            defaultValue={ordem?.status ?? "open"}
            className={inputClass}
          >
            {OS_STATUS.map((s) => (
              <option key={s} value={s}>
                {tOsStatus(s as OrdemServicoStatus)}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted hover:bg-cc-border-light"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-sm bg-cc-ink px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet hover:bg-cc-deep disabled:opacity-40"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
