"use client";

import { useEffect, useState } from "react";

import {
  LEAD_SOURCE_OPTIONS,
  LEAD_SOURCE_OTHER,
  leadSourceFromCliente,
  type LeadSource,
} from "@/lib/clientes/lead-source";
import { t } from "@/lib/i18n";
import type { Cliente } from "@/lib/types/database";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus";

const labelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.06em] text-cc-muted";

type Props = {
  cliente?: Pick<Cliente, "origem_lead" | "origem_lead_outro"> | null;
  required?: boolean;
  disabled?: boolean;
};

export function ClienteLeadSourceFields({
  cliente,
  required = false,
  disabled = false,
}: Props) {
  const initial = leadSourceFromCliente(cliente ?? {});
  const [source, setSource] = useState<LeadSource | "">(initial);
  const [outro, setOutro] = useState(cliente?.origem_lead_outro ?? "");

  useEffect(() => {
    setSource(leadSourceFromCliente(cliente ?? {}));
    setOutro(cliente?.origem_lead_outro ?? "");
  }, [cliente?.origem_lead, cliente?.origem_lead_outro]);

  return (
    <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
      <p className={labelClass}>{t("clientes.leadSource.title")}</p>
      <p className="mt-1 text-xs font-light text-cc-muted">
        {t("clientes.leadSource.hint")}
      </p>

      <div className="mt-3">
        <label htmlFor="origem_lead" className="sr-only">
          {t("clientes.leadSource.selectLabel")}
        </label>
        <select
          id="origem_lead"
          name="origem_lead"
          required={required}
          disabled={disabled}
          className={inputClass}
          value={source}
          onChange={(e) => {
            const next = (e.target.value || "") as LeadSource | "";
            setSource(next);
            if (next !== LEAD_SOURCE_OTHER) setOutro("");
          }}
        >
          <option value="">{t("clientes.leadSource.selectPlaceholder")}</option>
          {LEAD_SOURCE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(`clientes.leadSource.option.${option}`)}
            </option>
          ))}
        </select>
      </div>

      {source === LEAD_SOURCE_OTHER ? (
        <div className="mt-3">
          <label htmlFor="origem_lead_outro" className={labelClass}>
            {t("clientes.leadSource.otherLabel")}
          </label>
          <input
            id="origem_lead_outro"
            name="origem_lead_outro"
            type="text"
            required={required}
            disabled={disabled}
            className={`mt-1 ${inputClass}`}
            value={outro}
            onChange={(e) => setOutro(e.target.value)}
            placeholder={t("clientes.leadSource.otherPlaceholder")}
          />
        </div>
      ) : null}
    </section>
  );
}

/** Valida origem do lead antes do submit. */
export function validateClienteLeadSourceForm(
  formData: FormData,
  required: boolean,
): string | null {
  const raw = String(formData.get("origem_lead") ?? "").trim();
  if (!raw) {
    return required ? t("clientes.leadSource.required") : null;
  }
  if (raw === LEAD_SOURCE_OTHER) {
    const outro = String(formData.get("origem_lead_outro") ?? "").trim();
    if (!outro) return t("clientes.leadSource.otherRequired");
  }
  return null;
}
