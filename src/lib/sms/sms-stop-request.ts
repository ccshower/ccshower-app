import { isStopKeyword } from "../clientes/sms-consent";
import {
  parseTwilioFormBody,
  twilioSmsStopWebhookUrl,
  validateTwilioFormSignature,
} from "./twilio-signature";

export type SmsStopRecordResult =
  | { ok: true; updated: number }
  | { ok: false; message: string };

export type SmsStopRequestDeps = {
  recordStop: (telefone: string) => Promise<SmsStopRecordResult>;
  n8nAuthorized: (request: Request) => boolean;
};

function unauthorized() {
  return Response.json({ ok: false, message: "Nao autorizado" }, { status: 401 });
}

function textField(body: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

async function applyRecognizedStop(
  message: string,
  telefone: string,
  recordStop: SmsStopRequestDeps["recordStop"],
) {
  if (!isStopKeyword(message)) {
    return Response.json({ ok: true, updated: 0 });
  }
  if (!telefone) {
    return Response.json({ ok: false, message: "Phone is required" }, { status: 400 });
  }

  const result = await recordStop(telefone);
  if (!result.ok) {
    const status = result.message === "Phone is required" ? 400 : 500;
    return Response.json(
      {
        ok: false,
        message: status === 400 ? "Phone is required" : "Nao foi possivel registrar",
      },
      { status },
    );
  }
  return Response.json(result);
}

/**
 * Dois caminhos, sem fallback entre eles.
 * Header X-Twilio-Signature: só a assinatura Twilio, com a URL do servidor.
 * Sem esse header: só o segredo já usado pelos webhooks n8n.
 */
export async function handleSmsStopRequest(
  request: Request,
  deps: SmsStopRequestDeps,
): Promise<Response> {
  if (request.headers.has("x-twilio-signature")) {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/x-www-form-urlencoded")) {
      return unauthorized();
    }

    const params = parseTwilioFormBody(await request.text());
    const valid = validateTwilioFormSignature({
      authToken: process.env.TWILIO_AUTH_TOKEN,
      signature: request.headers.get("x-twilio-signature"),
      url: twilioSmsStopWebhookUrl(),
      params,
    });
    if (!valid) return unauthorized();

    const message = typeof params.Body === "string" ? params.Body.trim() : "";
    const telefone = typeof params.From === "string" ? params.From.trim() : "";
    return applyRecognizedStop(message, telefone, deps.recordStop);
  }

  if (!deps.n8nAuthorized(request)) return unauthorized();

  const raw = await request.json().catch(() => null);
  const body =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return applyRecognizedStop(
    textField(body, ["Body", "body", "message"]),
    textField(body, ["From", "from", "telefone", "phone"]),
    deps.recordStop,
  );
}
