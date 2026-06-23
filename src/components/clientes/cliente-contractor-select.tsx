"use client";

import { useEffect, useState } from "react";

import { t } from "@/lib/i18n";
import type { Contractor } from "@/lib/types/database";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus disabled:cursor-not-allowed disabled:bg-cc-border-light";

const labelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.06em] text-cc-muted";

type Props = {
  contractors: Contractor[];
  value: string;
  disabled?: boolean;
  onChange: (contractorId: string) => void;
};

export function ClienteContractorSelect({
  contractors,
  value,
  disabled,
  onChange,
}: Props) {
  return (
    <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
      <label htmlFor="contractor_id" className={labelClass}>
        {t("clientes.contractor.selectLabel")}
      </label>
      <p className="mt-1 text-xs font-light text-cc-muted">
        {t("clientes.contractor.selectHint")}
      </p>
      <select
        id="contractor_id"
        name="contractor_id"
        required
        disabled={disabled}
        className={`mt-2 ${inputClass}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{t("clientes.contractor.selectPlaceholder")}</option>
        {contractors.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
      {contractors.length === 0 ? (
        <p className="mt-2 text-xs text-amber-800">{t("clientes.contractor.empty")}</p>
      ) : null}
    </section>
  );
}

export function validateClienteContractorForm(
  tipoCliente: string,
  formData: FormData,
): string | null {
  if (tipoCliente !== "contractor") return null;
  const id = String(formData.get("contractor_id") ?? "").trim();
  if (!id) return t("clientes.contractor.required");
  return null;
}

/** Hidden field to clear contractor when type changes away from contractor. */
export function ClienteContractorHidden({ contractorId }: { contractorId: string | null }) {
  if (contractorId) return null;
  return <input type="hidden" name="contractor_id" value="" />;
}
