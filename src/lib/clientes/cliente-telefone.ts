import type { ClientType } from "@/lib/clientes/tipo-cliente";
import {
  resolveSmsConsentFromForm,
  type SmsConsentFields,
  type SmsConsentSnapshot,
} from "@/lib/clientes/sms-consent";
import { phoneForStorage, toE164Phone } from "@/lib/sms/e164";

/** Valor gravado em clientes.telefone. Vazio vira null. Não lê o telefone do Contractor. */
export function telefoneClienteParaGravar(raw: string | null | undefined): string | null {
  const stored = phoneForStorage(raw);
  return stored.trim() ? stored : null;
}

const TIPOS_TELEFONE_OBRIGATORIO = new Set<ClientType>(["residential", "commercial"]);

export function telefoneClienteObrigatorio(tipoCliente: ClientType): boolean {
  return TIPOS_TELEFONE_OBRIGATORIO.has(tipoCliente);
}

/** Primeira visita não converte de ou para contractor. */
export function tipoClienteNaPrimeiraVisita(
  tipoAtual: ClientType,
  tipoSolicitado: ClientType,
): ClientType {
  if (tipoAtual === "contractor" || tipoSolicitado === "contractor") return tipoAtual;
  return tipoSolicitado;
}

export function validarTelefoneCliente(
  tipoCliente: ClientType,
  raw: string | null | undefined,
): { ok: true; telefone: string | null } | { ok: false } {
  const telefone = telefoneClienteParaGravar(raw);
  if (telefoneClienteObrigatorio(tipoCliente) && !telefone) return { ok: false };
  return { ok: true, telefone };
}

/** Sem E.164 do cliente, a autorização não é gravada. O histórico de STOP permanece. */
export function resolveClienteSmsConsent(
  formData: FormData,
  telefone: string | null,
  previous: SmsConsentSnapshot | null,
): { ok: true; fields: SmsConsentFields } {
  const telefoneE164 = toE164Phone(telefone);
  if (!telefoneE164) {
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

  return resolveSmsConsentFromForm(formData, telefoneE164, previous);
}
