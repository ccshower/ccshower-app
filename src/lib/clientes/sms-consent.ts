export const SMS_CONSENT_METHOD_VERBAL = "verbal";

const STOP_KEYWORDS = new Set([
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
]);

export type SmsConsentFields = {
  sms_autorizado: boolean;
  sms_consentimento_em: string | null;
  sms_consentimento_metodo: string | null;
  sms_opt_out_em: string | null;
  sms_opt_out_origem: string | null;
};

export type SmsConsentSnapshot = SmsConsentFields & {
  telefone: string;
};

export function parseSmsChoice(value: unknown): "yes" | "no" {
  return String(value ?? "").trim().toLowerCase() === "yes" ? "yes" : "no";
}

export function isStopKeyword(value: unknown): boolean {
  const first = String(value ?? "").trim().toUpperCase().split(/\s+/)[0] ?? "";
  const word = first.replace(/[^A-Z]/g, "");
  return STOP_KEYWORDS.has(word);
}

/** Últimos 10 dígitos, sem o prefixo 1 de um número norte-americano de 11 dígitos. */
export function phoneMatchKey(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function timestampMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** Opt-out ainda é a decisão mais recente quando não há consentimento posterior. */
export function smsOptOutIsLatest(
  smsConsentimentoEm: string | null | undefined,
  smsOptOutEm: string | null | undefined,
): boolean {
  const optOutMs = timestampMs(smsOptOutEm);
  if (optOutMs == null) return false;
  const consentMs = timestampMs(smsConsentimentoEm);
  if (consentMs == null) return true;
  return optOutMs >= consentMs;
}

/** Vigente quando o checkbox está marcado, a data é legível e o STOP não é posterior. */
export function hasValidSmsConsent(input: {
  smsAutorizado: boolean | null | undefined;
  smsConsentimentoEm: string | null | undefined;
  smsOptOutEm: string | null | undefined;
}): boolean {
  if (input.smsAutorizado !== true) return false;
  if (timestampMs(input.smsConsentimentoEm) == null) return false;
  return !smsOptOutIsLatest(input.smsConsentimentoEm, input.smsOptOutEm);
}

export function resolveSmsConsentFromForm(
  formData: FormData,
  nextTelefone: string,
  previous: SmsConsentSnapshot | null,
): ReturnType<typeof resolveSmsConsentWrite> {
  return resolveSmsConsentWrite({
    choice: parseSmsChoice(formData.get("sms_autorizado")),
    nextTelefone,
    previous,
  });
}

export function resolveSmsConsentWrite(input: {
  choice: "yes" | "no";
  nextTelefone: string;
  previous: SmsConsentSnapshot | null;
  now?: Date;
}): { ok: true; fields: SmsConsentFields } {
  const previous = input.previous;
  const phoneChanged =
    previous != null && previous.telefone.trim() !== input.nextTelefone.trim();
  if (
    previous != null &&
    smsOptOutIsLatest(previous.sms_consentimento_em, previous.sms_opt_out_em)
  ) {
    return {
      ok: true,
      fields: {
        sms_autorizado: false,
        sms_consentimento_em: previous.sms_consentimento_em,
        sms_consentimento_metodo: previous.sms_consentimento_metodo,
        sms_opt_out_em: previous.sms_opt_out_em,
        sms_opt_out_origem: previous.sms_opt_out_origem,
      },
    };
  }

  if (input.choice === "no") {
    return {
      ok: true,
      fields: {
        sms_autorizado: false,
        sms_consentimento_em: previous?.sms_consentimento_em ?? null,
        sms_consentimento_metodo: previous?.sms_consentimento_metodo ?? null,
        sms_opt_out_em: previous?.sms_opt_out_em ?? null,
        sms_opt_out_origem: previous?.sms_opt_out_origem ?? null,
      },
    };
  }

  const alreadyValidForThisPhone =
    previous != null &&
    !phoneChanged &&
    hasValidSmsConsent({
      smsAutorizado: previous.sms_autorizado,
      smsConsentimentoEm: previous.sms_consentimento_em,
      smsOptOutEm: previous.sms_opt_out_em,
    });

  if (alreadyValidForThisPhone) {
    return {
      ok: true,
      fields: {
        sms_autorizado: true,
        sms_consentimento_em: previous.sms_consentimento_em,
        sms_consentimento_metodo: previous.sms_consentimento_metodo,
        sms_opt_out_em: previous.sms_opt_out_em,
        sms_opt_out_origem: previous.sms_opt_out_origem,
      },
    };
  }

  return {
    ok: true,
    fields: {
      sms_autorizado: true,
      sms_consentimento_em: (input.now ?? new Date()).toISOString(),
      sms_consentimento_metodo: SMS_CONSENT_METHOD_VERBAL,
      sms_opt_out_em: previous?.sms_opt_out_em ?? null,
      sms_opt_out_origem: previous?.sms_opt_out_origem ?? null,
    },
  };
}

type SmsStopClient = {
  from: (table: "clientes") => {
    select: (columns: string) => {
      ilike: (
        column: string,
        pattern: string,
      ) => PromiseLike<{
        data: { id: string; telefone: string | null }[] | null;
        error: { message: string } | null;
      }>;
    };
    update: (values: Pick<SmsConsentFields, "sms_autorizado" | "sms_opt_out_em" | "sms_opt_out_origem">) => {
      in: (
        column: "id",
        values: string[],
      ) => PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

/** Grava STOP nas colunas já existentes e desmarca a autorização. */
export async function recordSmsStop(
  supabase: SmsStopClient,
  telefone: string,
  now = new Date(),
): Promise<{ ok: true; updated: number } | { ok: false; message: string }> {
  const key = phoneMatchKey(telefone);
  if (key.length < 10) {
    return { ok: false, message: "Phone is required" };
  }

  const { data, error } = await supabase
    .from("clientes")
    .select("id, telefone")
    .ilike("telefone", `%${key}%`);

  if (error) return { ok: false, message: error.message };

  const ids = (data ?? [])
    .filter((row) => phoneMatchKey(row.telefone ?? "") === key)
    .map((row) => row.id);

  if (ids.length === 0) return { ok: true, updated: 0 };

  const { error: updateError } = await supabase
    .from("clientes")
    .update({
      sms_autorizado: false,
      sms_opt_out_em: now.toISOString(),
      sms_opt_out_origem: "stop",
    })
    .in("id", ids);

  if (updateError) return { ok: false, message: updateError.message };
  return { ok: true, updated: ids.length };
}
