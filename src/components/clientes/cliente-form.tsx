"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ClienteContractorSelect,
  validateClienteContractorForm,
} from "@/components/clientes/cliente-contractor-select";
import {
  ClienteLeadSourceFields,
  validateClienteLeadSourceForm,
} from "@/components/clientes/cliente-lead-source-fields";
import { Field } from "@/components/ui/field";
import {
  CLIENT_TYPE,
  parseClientType,
  type ClientType,
} from "@/lib/clientes/tipo-cliente";
import { t, tClientType } from "@/lib/i18n";
import {
  filterEquipesForStage,
  pickDefaultCommercialEquipeId,
} from "@/lib/ordens-servico/workflow-equipe";
import type {
  Cliente,
  ClienteWithRelations,
  Contractor,
  Equipe,
  Usuario,
} from "@/lib/types/database";

import {
  GooglePlacesField,
  googleAddressFromCliente,
  type GoogleAddress,
} from "@/components/maps/google-places-field";

export type ClienteFormMode = "admin" | "primeira_visita";

export function ClienteForm({
  cliente,
  equipes = [],
  usuarios = [],
  contractors,
  apiKey,
  formKey,
  pending,
  canChooseEquipe = false,
  defaultEquipeId = null,
  mode = "admin",
  onCancel,
  onSubmit,
}: {
  cliente?: Cliente | ClienteWithRelations | null;
  equipes?: Equipe[];
  usuarios?: Usuario[];
  contractors: Contractor[];
  apiKey: string;
  formKey: string;
  pending: boolean;
  canChooseEquipe?: boolean;
  defaultEquipeId?: string | null;
  mode?: ClienteFormMode;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const [address, setAddress] = useState<GoogleAddress>(() =>
    googleAddressFromCliente(cliente),
  );
  const [equipeError, setEquipeError] = useState<string | null>(null);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [contractorError, setContractorError] = useState<string | null>(null);
  const [tipoCliente, setTipoCliente] = useState<ClientType>(() =>
    parseClientType(cliente?.tipo_cliente ?? "residential"),
  );
  const [contractorId, setContractorId] = useState(
    () => cliente?.contractor_id ?? "",
  );
  const commercialEquipes = useMemo(
    () => filterEquipesForStage(equipes, "commercial"),
    [equipes],
  );
  const effectiveEquipeId = useMemo(() => {
    if (cliente?.equipe_id) return cliente.equipe_id;
    return pickDefaultCommercialEquipeId(equipes, defaultEquipeId);
  }, [cliente, equipes, defaultEquipeId]);
  const lockedEquipe = useMemo(
    () => commercialEquipes.find((e) => e.id === effectiveEquipeId) ?? commercialEquipes[0],
    [commercialEquipes, effectiveEquipeId],
  );
  const primeiraVisita = mode === "primeira_visita";
  const tipoTravado =
    primeiraVisita &&
    parseClientType(cliente?.tipo_cliente ?? "residential") === "contractor";
  const tipoOptions = primeiraVisita
    ? CLIENT_TYPE.filter((tipo) => tipo !== "contractor")
    : CLIENT_TYPE;

  useEffect(() => {
    setAddress(googleAddressFromCliente(cliente));
    setTipoCliente(parseClientType(cliente?.tipo_cliente ?? "residential"));
    setContractorId(cliente?.contractor_id ?? "");
  }, [cliente, formKey]);

  return (
    <form
      className="space-y-3"
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        const busca = String(fd.get("endereco_busca") ?? "").trim();
        const merged: GoogleAddress = {
          ...address,
          endereco_formatado: address.endereco_formatado.trim() || busca,
        };
        Object.entries(merged).forEach(([key, value]) => fd.set(key, value));
        if (!merged.endereco_formatado) {
          return;
        }
        if (!primeiraVisita) {
          const equipeId = canChooseEquipe
            ? String(fd.get("equipe_id") ?? "").trim()
            : String(effectiveEquipeId ?? "").trim();
          if (!equipeId) {
            setEquipeError(
              commercialEquipes.length === 0
                ? t("equipe.noCommercialTeam")
                : canChooseEquipe
                  ? t("equipe.required")
                  : t("equipe.userWithoutTeam"),
            );
            return;
          }
          setEquipeError(null);
          if (!canChooseEquipe) {
            fd.set("equipe_id", equipeId);
          }
        }
        const leadErr = validateClienteLeadSourceForm(fd, false);
        if (leadErr) {
          setLeadError(leadErr);
          return;
        }
        setLeadError(null);
        if (!primeiraVisita) {
          const contractorErr = validateClienteContractorForm(
            String(fd.get("tipo_cliente") ?? ""),
            fd,
          );
          if (contractorErr) {
            setContractorError(contractorErr);
            return;
          }
          setContractorError(null);
        }
        onSubmit(fd);
      }}
    >
      {cliente ? <input type="hidden" name="id" value={cliente.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Customer name">
          <input
            name="nome"
            required
            defaultValue={cliente?.nome ?? ""}
            className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
          />
        </Field>
        <Field label="Phone">
          <input
            name="telefone"
            required
            defaultValue={cliente?.telefone ?? ""}
            className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
            placeholder="+1"
          />
        </Field>
      </div>

      <Field label="Email" hint="Optional">
        <input
          name="email"
          type="text"
          inputMode="email"
          autoComplete="email"
          defaultValue={cliente?.email ?? ""}
          className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
        />
      </Field>

      <Field label="Customer type">
        {tipoTravado ? (
          <p className="rounded-sm border border-cc-border bg-cc-border-light/40 px-3 py-2.5 text-sm text-cc-ink">
            {tClientType("contractor")}
          </p>
        ) : (
          <select
            name="tipo_cliente"
            required
            value={tipoCliente}
            onChange={(e) => {
              const next = parseClientType(e.target.value);
              setTipoCliente(next);
              if (next !== "contractor") setContractorId("");
              setContractorError(null);
            }}
            className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
          >
            {tipoOptions.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tClientType(tipo)}
              </option>
            ))}
          </select>
        )}
      </Field>

      {!primeiraVisita ? (
        tipoCliente === "contractor" ? (
          <ClienteContractorSelect
            contractors={contractors}
            value={contractorId}
            disabled={pending}
            onChange={setContractorId}
          />
        ) : (
          <input type="hidden" name="contractor_id" value="" />
        )
      ) : null}
      {contractorError ? (
        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
          {contractorError}
        </p>
      ) : null}

      <ClienteLeadSourceFields
        key={`lead-${formKey}`}
        cliente={cliente}
        required={false}
        disabled={pending}
      />
      {leadError ? (
        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
          {leadError}
        </p>
      ) : null}

      <GooglePlacesField
        apiKey={apiKey}
        resetKey={formKey}
        address={address}
        onAddress={setAddress}
        active
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="City">
          <input
            value={address.cidade}
            onChange={(e) => setAddress({ ...address, cidade: e.target.value })}
            className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
          />
        </Field>
        <Field label="State">
          <input
            value={address.estado}
            onChange={(e) => setAddress({ ...address, estado: e.target.value })}
            className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
          />
        </Field>
        <Field label="ZIP">
          <input
            value={address.cep}
            onChange={(e) => setAddress({ ...address, cep: e.target.value })}
            className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
          />
        </Field>
      </div>

      {!primeiraVisita ? (
        <Field label={t("equipe.operational")} hint={t("equipe.hint")}>
          {commercialEquipes.length === 0 ? (
            <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2.5 text-sm text-cc-red">
              {t("equipe.noCommercialTeam")}
            </p>
          ) : canChooseEquipe ? (
            <select
              name="equipe_id"
              required
              defaultValue={effectiveEquipeId ?? ""}
              className={`w-full rounded-sm border-[1.5px] bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus ${equipeError ? "border-cc-red" : "border-cc-border"}`}
              onChange={() => setEquipeError(null)}
            >
              {commercialEquipes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input type="hidden" name="equipe_id" value={effectiveEquipeId ?? ""} />
              <p className="rounded-sm border border-cc-border bg-cc-border-light/40 px-3 py-2.5 text-sm text-cc-ink">
                {lockedEquipe?.nome ?? "—"}
              </p>
            </>
          )}
          {equipeError ? (
            <span className="block text-xs text-cc-red">{equipeError}</span>
          ) : null}
        </Field>
      ) : null}

      <Field label="Notes">
        <textarea
          name="observacoes"
          defaultValue={cliente?.observacoes ?? ""}
          rows={3}
          className="w-full rounded-sm border-[1.5px] border-cc-border px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
        />
      </Field>

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
          Save
        </button>
      </div>
    </form>
  );
}
