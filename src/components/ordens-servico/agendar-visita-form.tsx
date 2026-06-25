"use client";

import { useEffect, useMemo, useState } from "react";

import { OsPossuiInstalacaoField } from "@/components/ordens-servico/os-possui-instalacao-field";
import { OsVisitaAgendaPicker } from "@/components/ordens-servico/os-visita-agenda-picker";
import { ClienteEnderecoMapsLink } from "@/components/maps/cliente-endereco-mapa";
import { Field } from "@/components/ui/field";
import type { ClientType } from "@/lib/clientes/tipo-cliente";
import {
  parseOsWorkflowStage,
  type OsWorkflowStage,
} from "@/lib/ordens-servico/workflow";
import { filterEquipesForStage } from "@/lib/ordens-servico/workflow-equipe";

import type { Equipe } from "@/lib/types/database";

type ClienteContatoResumo = {
  telefone: string;
  endereco_formatado: string;
};

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none transition placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

type Props = {
  clienteId: string;
  clienteNome: string;
  tipoCliente: ClientType;
  equipes: Equipe[];
  /** Etapa operacional — filtra equipes por codigo_operacional. */
  etapa?: OsWorkflowStage | string | null;
  defaultEquipeId: string | null;
  initialEquipeId: string | null;
  osId?: string;
  clienteContato?: ClienteContatoResumo | null;
  pending?: boolean;
  fluxoBloqueado?: boolean;
  permitirDatasRetroativas?: boolean;
  hideCancel?: boolean;
  onCancel?: () => void;
  onSubmit: (fd: FormData) => void;
};

function resolveInitialEquipeId(
  equipesEtapa: Equipe[],
  initialEquipeId: string | null,
  defaultEquipeId: string | null,
): string {
  const preferred = initialEquipeId ?? defaultEquipeId ?? "";
  if (preferred && equipesEtapa.some((e) => e.id === preferred)) return preferred;
  return equipesEtapa[0]?.id ?? "";
}

export function AgendarVisitaForm({
  clienteId,
  clienteNome,
  tipoCliente,
  equipes,
  etapa = "commercial",
  defaultEquipeId,
  initialEquipeId,
  osId,
  clienteContato,
  pending = false,
  fluxoBloqueado = false,
  permitirDatasRetroativas = false,
  hideCancel = false,
  onCancel,
  onSubmit,
}: Props) {
  const stage = parseOsWorkflowStage(etapa) ?? "commercial";
  const equipesEtapa = useMemo(
    () => filterEquipesForStage(equipes, stage),
    [equipes, stage],
  );
  const [equipeId, setEquipeId] = useState(() =>
    resolveInitialEquipeId(
      filterEquipesForStage(equipes, stage),
      initialEquipeId,
      defaultEquipeId,
    ),
  );
  const [dataVisita, setDataVisita] = useState("");
  const [horaVisita, setHoraVisita] = useState("");
  const [horaFimVisita, setHoraFimVisita] = useState("");

  useEffect(() => {
    setEquipeId((current) => {
      if (current && equipesEtapa.some((e) => e.id === current)) return current;
      return resolveInitialEquipeId(
        equipesEtapa,
        initialEquipeId,
        defaultEquipeId,
      );
    });
  }, [equipesEtapa, initialEquipeId, defaultEquipeId]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("cliente_id", clienteId);
        fd.set("titulo", `Visit — ${clienteNome}`);
        if (osId) fd.set("os_id", osId);
        onSubmit(fd);
      }}
    >
      <div className="rounded-ds-lg border border-cc-border bg-cc-canvas/60 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-subtle">
          Customer
        </p>
        {clienteContato ? (
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
                Name
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-cc-ink">{clienteNome}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
                Phone
              </dt>
              <dd className="mt-0.5 text-sm text-cc-deep">{clienteContato.telefone || "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
                Address
              </dt>
              <dd className="mt-0.5">
                {clienteContato.endereco_formatado?.trim() ? (
                  <ClienteEnderecoMapsLink
                    enderecoFormatado={clienteContato.endereco_formatado}
                  />
                ) : (
                  <span className="text-sm text-cc-deep">—</span>
                )}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-cc-deep">
            Customer: <span className="font-medium text-cc-ink">{clienteNome}</span>
          </p>
        )}
      </div>

      <div className="rounded-ds-lg border border-cc-border bg-cc-surface p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-subtle">
          Visit
        </p>
        <div className="mt-3 space-y-3">
          <Field label="Visit context">
            <textarea
              name="descricao"
              rows={3}
              className={inputClass}
              placeholder="E.g. measurements, cuts, hardware, bathroom context"
            />
          </Field>

          <Field label="Operational team">
            <select
              name="equipe_id"
              value={equipeId}
              onChange={(e) => {
                setEquipeId(e.target.value);
                setHoraVisita("");
              }}
              className={inputClass}
              required
              disabled={equipesEtapa.length === 0}
            >
              <option value="" disabled>
                {equipesEtapa.length === 0
                  ? "No teams available for this stage"
                  : "Select a team"}
              </option>
              {equipesEtapa.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </Field>

          <OsVisitaAgendaPicker
            equipes={equipesEtapa}
            equipeId={equipeId}
            dataVisita={dataVisita}
            horaVisita={horaVisita}
            horaFimVisita={horaFimVisita}
            onDataChange={setDataVisita}
            onHoraChange={setHoraVisita}
            onHoraFimChange={setHoraFimVisita}
            permitirDatasRetroativas={permitirDatasRetroativas}
          />
        </div>
      </div>

      <div className="rounded-ds-lg border border-cc-border bg-cc-surface p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-subtle">
          Operational continuity
        </p>
        <div className="mt-3">
          <OsPossuiInstalacaoField
            resetKey={`${clienteId}-${tipoCliente}`}
            tipoCliente={tipoCliente}
          />
        </div>
      </div>

      <div
        className={
          hideCancel
            ? "flex justify-end"
            : "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
        }
      >
        {!hideCancel ? (
          <button
            type="button"
            className="rounded-sm px-3 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted hover:bg-cc-border-light"
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={
            pending ||
            fluxoBloqueado ||
            !equipeId ||
            !dataVisita ||
            !horaVisita ||
            !horaFimVisita ||
            equipesEtapa.length === 0
          }
          className="w-full rounded-sm bg-cc-ink px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-lift hover:bg-cc-deep disabled:opacity-40 sm:w-auto"
        >
          {pending ? "Scheduling…" : "Schedule visit"}
        </button>
      </div>
    </form>
  );
}

