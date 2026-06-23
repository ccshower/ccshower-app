import { t } from "@/lib/i18n";
import type { ClientType } from "@/lib/clientes/tipo-cliente";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseContractorId(
  raw: FormDataEntryValue | null | undefined,
): string | null {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  return UUID_RE.test(v) ? v : null;
}

export function parseClienteContractorFromForm(
  tipoCliente: ClientType,
  formData: FormData,
):
  | { ok: true; contractor_id: string | null }
  | { ok: false; message: string } {
  const contractorId = parseContractorId(formData.get("contractor_id"));

  if (tipoCliente === "contractor") {
    if (!contractorId) {
      return { ok: false, message: t("clientes.contractor.required") };
    }
    return { ok: true, contractor_id: contractorId };
  }

  return { ok: true, contractor_id: null };
}

function mapDbErrorContractor(message: string): string {
  if (
    message.includes("contractor_id") ||
    message.includes("contractors") ||
    message.includes("tipo_cliente")
  ) {
    return "Database out of date: apply migration supabase/migrations/20250625150000_contractors.sql in Supabase.";
  }
  return message;
}

export { mapDbErrorContractor };
