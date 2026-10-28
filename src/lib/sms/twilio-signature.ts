import twilio from "twilio";

export const SMS_STOP_WEBHOOK_PATH = "/api/webhooks/n8n/sms-stop";

export type TwilioFormParams = Record<string, string | string[]>;

/** Todos os campos recebidos entram na assinatura. Campos novos do Twilio não são descartados. */
export function parseTwilioFormBody(raw: string): TwilioFormParams {
  const search = new URLSearchParams(raw);
  const params: TwilioFormParams = {};
  for (const key of search.keys()) {
    if (Object.prototype.hasOwnProperty.call(params, key)) continue;
    const values = search.getAll(key);
    params[key] = values.length > 1 ? values : (values[0] ?? "");
  }
  return params;
}

/**
 * URL que o Twilio assina. Sai só de APP_BASE_URL no servidor, mais o caminho fixo.
 * Host, URL e corpo da requisição não escolhem esse endereço.
 */
export function twilioSmsStopWebhookUrl(
  appBaseUrl = process.env.APP_BASE_URL,
): string | null {
  const base = appBaseUrl?.trim();
  if (!base) return null;

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== "/" && url.pathname !== "") return null;

  return `${url.protocol}//${url.host}${SMS_STOP_WEBHOOK_PATH}`;
}

/** Validação oficial do SDK: HMAC-SHA1 em X-Twilio-Signature, comparação em tempo constante. */
export function validateTwilioFormSignature(input: {
  authToken: string | undefined;
  signature: string | null;
  url: string | null;
  params: TwilioFormParams;
}): boolean {
  const token = input.authToken?.trim() ?? "";
  const signature = input.signature?.trim() ?? "";
  const url = input.url?.trim() ?? "";
  if (!token || !signature || !url) return false;
  return twilio.validateRequest(token, signature, url, input.params);
}
