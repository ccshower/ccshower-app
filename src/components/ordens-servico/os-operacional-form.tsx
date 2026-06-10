"use client";

import { useMemo, useState } from "react";

import { OsEquipeResponsavelFields } from "@/components/ordens-servico/os-equipe-responsavel-fields";
import { OsOperacionalBadge } from "@/components/ordens-servico/os-operacional-badge";
import { OsPossuiInstalacaoField } from "@/components/ordens-servico/os-possui-instalacao-field";
import { OsVisitaAgendaPicker } from "@/components/ordens-servico/os-visita-agenda-picker";
import { Field } from "@/components/ui/field";
import type { ClientType } from "@/lib/clientes/tipo-cliente";
import { OS_STATUS, type OrdemServicoStatus } from "@/lib/ordens-servico/constants";
import { tOsStatus } from "@/lib/i18n";
import { defaultVisitaDateTime, parseVisitaDateTime } from "@/lib/ordens-servico/datetime";
import type { Equipe, OrdemServicoWithRelations, Usuario } from "@/lib/types/database";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none transition placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

type BaseProps = {
  equipes: Equipe[];
  usuarios: Usuario[];
  defaultEquipeId: string | null;
  pending?: boolean;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
};

type CreateProps = BaseProps & {
  mode: "create";
  clienteId: string;
  clienteNome?: string;
  tipoCliente?: ClientType | null;
  initialEquipeId?: string | null;
  submitLabel?: string;
};

type EditProps = BaseProps & {
  mode: "edit";
  ordem: OrdemServicoWithRelations;
  submitLabel?: string;
};

export type OsOperacionalFormProps = CreateProps | EditProps;

export function OsOperacionalForm(props: OsOperacionalFormProps) {
  const {
    equipes,
    usuarios,
    defaultEquipeId,
    pending = false,
    onCancel,
    onSubmit,
  } = props;

  const activeEquipes = useMemo(() => equipes.filter((e) => e.ativo), [equipes]);

  const isEdit = props.mode === "edit";
  const ordem = isEdit ? props.ordem : null;
  const visitaDefaults = isEdit
    ? parseVisitaDateTime(ordem?.visita_inicial?.data_inicio)
    : defaultVisitaDateTime();

  const [equipeId, setEquipeId] = useState(
    () =>
      ordem?.equipe_atual_id ??
      ordem?.equipe_id ??
      (props.mode === "create" ? props.initialEquipeId : null) ??
      defaultEquipeId ??
      "",
  );
  const [dataVisita, setDataVisita] = useState(visitaDefaults.data);
  const [horaVisita, setHoraVisita] = useState(visitaDefaults.hora);

  const clienteNome = isEdit
    ? ordem?.cliente?.nome
    : props.clienteNome;
  const tipoCliente = isEdit
    ? ordem?.cliente?.tipo_cliente
    : props.mode === "create"
      ? props.tipoCliente
      : null;
  const instalacaoKey = isEdit
    ? `${ordem!.id}-${ordem!.possui_instalacao}`
    : `${props.mode === "create" ? props.clienteId : ""}-${tipoCliente ?? ""}`;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      {isEdit ? (
        <>
          <input type="hidden" name="id" value={ordem!.id} />
          {ordem!.visita_inicial?.id ? (
            <input type="hidden" name="visita_id" value={ordem!.visita_inicial.id} />
          ) : null}
        </>
      ) : (
        <input type="hidden" name="cliente_id" value={props.clienteId} />
      )}

      {clienteNome ? (
        <p className="rounded-sm bg-cc-border-light px-3 py-2 text-sm text-cc-deep">
          Customer: <span className="font-medium text-cc-ink">{clienteNome}</span>
        </p>
      ) : null}

      {isEdit && ordem?.equipe ? (
        <div className="flex flex-wrap items-center gap-2">
          <OsOperacionalBadge
            equipeAtual={ordem.equipe}
            etapaAtual={ordem.etapa_atual}
            statusAtual={ordem.status_atual}
          />
        </div>
      ) : null}

      {!isEdit ? (
        <input type="hidden" name="etapa_atual" value="commercial" />
      ) : null}

      <Field label="Work order title">
        <input
          name="titulo"
          required
          defaultValue={
            ordem?.titulo ??
            (clienteNome ? `Visit — ${clienteNome}` : "")
          }
          className={inputClass}
        />
      </Field>

      <Field label="Description">
        <textarea
          name="descricao"
          rows={2}
          defaultValue={ordem?.descricao ?? ""}
          className={inputClass}
          placeholder="Visit context"
        />
      </Field>

      <OsEquipeResponsavelFields
        equipes={activeEquipes}
        usuarios={usuarios}
        defaultEquipeId={defaultEquipeId}
        initialEquipeId={
          ordem?.equipe_atual_id ??
          ordem?.equipe_id ??
          (props.mode === "create" ? props.initialEquipeId : null)
        }
        initialResponsavelId={ordem?.responsavel_id}
        requireEquipe
        onEquipeChange={(id) => {
          setEquipeId(id);
          setHoraVisita("");
        }}
      />

      <OsVisitaAgendaPicker
        equipes={activeEquipes}
        equipeId={equipeId}
        dataVisita={dataVisita}
        horaVisita={horaVisita}
        onDataChange={setDataVisita}
        onHoraChange={setHoraVisita}
        excluirEventoId={ordem?.visita_inicial?.id}
      />

      <OsPossuiInstalacaoField
        key={instalacaoKey}
        resetKey={instalacaoKey}
        tipoCliente={tipoCliente ?? undefined}
        initialChecked={isEdit ? ordem!.possui_instalacao : undefined}
      />

      <Field label="Notes">
        <textarea
          name="observacoes"
          rows={2}
          defaultValue={ordem?.observacoes ?? ""}
          className={inputClass}
        />
      </Field>

      {isEdit ? (
        <Field label="Visit / work order status">
          <select
            name="status"
            defaultValue={ordem!.status}
            className={inputClass}
          >
            {OS_STATUS.filter((s) => s !== "completed" && s !== "cancelled").map(
              (s) => (
                <option key={s} value={s}>
                  {tOsStatus(s as OrdemServicoStatus)}
                </option>
              ),
            )}
          </select>
          <p className="mt-1 text-xs font-light text-cc-muted">
            A etapa operacional e alterada apenas pelo fluxo acima (pipeline
            protegido).
          </p>
        </Field>
      ) : null}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="rounded-sm px-3 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted hover:bg-cc-border-light"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending || !dataVisita || !horaVisita}
          className="rounded-sm bg-cc-ink px-4 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet hover:bg-cc-deep disabled:opacity-40"
        >
          {pending
            ? "Saving…"
            : props.submitLabel ??
              (isEdit ? "Save changes" : "Open work order and schedule visit")}
        </button>
      </div>
    </form>
  );
}
