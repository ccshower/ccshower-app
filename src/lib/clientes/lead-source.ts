import { t } from "@/lib/i18n";

/** Origem do lead — qualificação no cadastro (Sales). */
export const LEAD_SOURCE_OPTIONS = [
  "google",
  "facebook",
  "returning_client",
  "referral",
  "contractor",
  "instagram",
  "call",
  "other",
] as const;

export type LeadSource = (typeof LEAD_SOURCE_OPTIONS)[number];

export const LEAD_SOURCE_OTHER = "other" as const;

export function parseLeadSource(
  raw: string | null | undefined,
): LeadSource | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  return (LEAD_SOURCE_OPTIONS as readonly string[]).includes(v)
    ? (v as LeadSource)
    : null;
}

export function tLeadSource(value: string | null | undefined): string {
  const parsed = parseLeadSource(value);
  if (!parsed) return "";
  return t(`clientes.leadSource.option.${parsed}`);
}

export function leadSourceFromCliente(cliente: {
  origem_lead?: string | null;
  origem_lead_outro?: string | null;
}): LeadSource | "" {
  return parseLeadSource(cliente.origem_lead) ?? "";
}

export function formatLeadSourceDisplay(cliente: {
  origem_lead?: string | null;
  origem_lead_outro?: string | null;
}): string {
  const source = parseLeadSource(cliente.origem_lead);
  if (!source) return "";
  if (source === LEAD_SOURCE_OTHER) {
    return cliente.origem_lead_outro?.trim() || tLeadSource(source);
  }
  return tLeadSource(source);
}

export function parseLeadSourceFromForm(
  formData: FormData,
  options: { required: boolean },
):
  | {
      ok: true;
      origem_lead: LeadSource | null;
      origem_lead_outro: string | null;
    }
  | { ok: false; message: string } {
  const raw = String(formData.get("origem_lead") ?? "").trim();
  const source = parseLeadSource(raw);

  if (!source) {
    if (options.required) {
      return {
        ok: false,
        message: t("clientes.leadSource.required"),
      };
    }
    return { ok: true, origem_lead: null, origem_lead_outro: null };
  }

  if (source === LEAD_SOURCE_OTHER) {
    const outro = String(formData.get("origem_lead_outro") ?? "").trim();
    if (!outro) {
      return {
        ok: false,
        message: t("clientes.leadSource.otherRequired"),
      };
    }
    return { ok: true, origem_lead: source, origem_lead_outro: outro };
  }

  return { ok: true, origem_lead: source, origem_lead_outro: null };
}

function mapDbErrorLeadSource(message: string): string {
  if (message.includes("origem_lead")) {
    return "Database out of date: apply migration supabase/migrations/20250625140000_cliente_origem_lead.sql in Supabase.";
  }
  return message;
}

export { mapDbErrorLeadSource };
