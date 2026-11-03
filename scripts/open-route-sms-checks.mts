import { readFileSync } from "node:fs";

import { toE164Phone } from "../src/lib/sms/e164.ts";
import {
  CLIENT_ETA_SMS_DEDUPE_MS,
  clientEtaSmsDedupeSince,
  decideClientEtaSms,
  recentClientEtaSmsBlocks,
} from "../src/lib/ordens-servico/open-route-policy.ts";
import { dispatchOpenRouteWebhook } from "../src/lib/ordens-servico/os-open-route-webhook.ts";
import type { OpenRouteWebhookPayload } from "../src/lib/ordens-servico/os-open-route-webhook.ts";

const failures: string[] = [];
function check(name: string, ok: boolean) {
  if (!ok) failures.push(name);
}

const approvedTestNumber = "+1 (413) 650-9502";
const approvedE164 = "+14136509502";
const consent = {
  smsAutorizado: true as const,
  smsConsentimentoEm: "2026-10-01T12:00:00.000Z",
  smsOptOutEm: null,
};

const commercial = decideClientEtaSms({
  stage: "commercial",
  statusAtual: "visit_in_progress",
  osStatus: "in_progress",
  ...consent,
  telefone: approvedTestNumber,
});
check(
  "commercial queues technical visit sms",
  commercial.queue === true &&
    commercial.event === "technical_visit_open_route" &&
    commercial.telefone === approvedE164,
);

const commercialScheduled = decideClientEtaSms({
  stage: "commercial",
  statusAtual: "visit_scheduled",
  osStatus: "scheduled",
  ...consent,
  telefone: "4136509502",
});
check(
  "commercial scheduled visit queues the same e164",
  commercialScheduled.queue && commercialScheduled.telefone === approvedE164,
);

const installation = decideClientEtaSms({
  stage: "installation",
  statusAtual: "installation_scheduled",
  osStatus: "scheduled",
  ...consent,
  telefone: "1 (413) 650-9502",
});
check(
  "installation queues installer sms",
  installation.queue === true &&
    installation.event === "installer_open_route" &&
    installation.telefone === approvedE164,
);

const noConsent = decideClientEtaSms({
  stage: "installation",
  statusAtual: "installation_in_progress",
  osStatus: "in_progress",
  smsAutorizado: false,
  smsConsentimentoEm: consent.smsConsentimentoEm,
  smsOptOutEm: null,
  telefone: approvedE164,
});
check(
  "missing consent does not queue",
  noConsent.queue === false &&
    noConsent.message === "Customer has not authorized SMS",
);

const optedOut = decideClientEtaSms({
  stage: "commercial",
  statusAtual: "visit_in_progress",
  osStatus: "in_progress",
  smsAutorizado: true,
  smsConsentimentoEm: consent.smsConsentimentoEm,
  smsOptOutEm: "2026-10-02T12:00:00.000Z",
  telefone: approvedE164,
});
check(
  "later stop does not queue",
  optedOut.queue === false &&
    optedOut.message === "Customer has not authorized SMS",
);

for (const telefone of ["abc", "12345", "0000000000", "(413) 650", "+1"]) {
  const invalid = decideClientEtaSms({
    stage: "installation",
    statusAtual: "installation_in_progress",
    osStatus: "in_progress",
    ...consent,
    telefone,
  });
  check(
    `invalid phone does not queue: ${telefone}`,
    invalid.queue === false && invalid.message === "Customer phone invalid",
  );
  check(`formatter rejects ${telefone}`, toE164Phone(telefone) === null);
}

const missingPhone = decideClientEtaSms({
  stage: "installation",
  statusAtual: "installation_in_progress",
  osStatus: "in_progress",
  ...consent,
  telefone: "   ",
});
check(
  "blank phone stays missing",
  missingPhone.queue === false && missingPhone.message === "Customer phone missing",
);

const now = Date.parse("2026-11-03T15:00:00.000Z");
check(
  "dedupe window is 20 minutes",
  CLIENT_ETA_SMS_DEDUPE_MS === 20 * 60_000 &&
    Date.parse(clientEtaSmsDedupeSince(now)) === now - CLIENT_ETA_SMS_DEDUPE_MS,
);
check("recent sms blocks another send", recentClientEtaSmsBlocks(1));
check("first sms in the window is allowed", recentClientEtaSmsBlocks(0) === false);

const completed = decideClientEtaSms({
  stage: "installation",
  statusAtual: "installation_in_progress",
  osStatus: "completed",
  ...consent,
  telefone: approvedE164,
});
check("completed order does not queue", completed.queue === false && !completed.message);

const workflow = JSON.parse(
  readFileSync(new URL("../n8n/ccshower-open-route-eta-sms.json", import.meta.url), "utf8"),
) as {
  nodes: Array<{
    name: string;
    type: string;
    parameters: Record<string, unknown>;
    credentials?: Record<string, { name?: string }>;
  }>;
};
const serialized = JSON.stringify(workflow);
check("workflow has no from-number placeholder", !serialized.includes("YOUR_TWILIO_FROM_E164"));
check(
  "workflow keeps the messaging service placeholder",
  serialized.includes("YOUR_TWILIO_MESSAGING_SERVICE_SID"),
);
const sendNode = workflow.nodes.find((node) => node.name === "Twilio - Enviar SMS cliente");
const bodyParameters = sendNode?.parameters.bodyParameters as
  | { parameters?: Array<{ name?: string; value?: string }> }
  | undefined;
const bodyNames = (bodyParameters?.parameters ?? []).map((field) => field.name);
check("send node reuses ccshower_twilio", sendNode?.credentials?.twilioApi?.name === "ccshower_twilio");
check("send node posts MessagingServiceSid", bodyNames.includes("MessagingServiceSid"));
check("send node does not set From", !bodyNames.includes("From"));
check(
  "webhook still requires header auth",
  workflow.nodes.some(
    (node) =>
      node.name === "Webhook Open Route" &&
      node.parameters.authentication === "headerAuth" &&
      node.credentials?.httpHeaderAuth?.name === "ccshower_open_route_webhook_auth",
  ),
);

const codeNode = workflow.nodes.find((node) => node.name === "Montar SMS cliente");
const buildSms = new Function("$json", String(codeNode?.parameters.jsCode ?? "")) as (
  input: { body: Record<string, unknown> },
) => Array<{ json: { telefone: string; sms_body: string } }>;
const technicalSms = buildSms({
  body: {
    event: "technical_visit_open_route",
    cliente: {
      nome: "STEPHANIE C.",
      telefone: approvedTestNumber,
      endereco_formatado: "3178 WAVERING LN",
    },
    eta: { minutos: 28, chegada_local: "Nov 3, 2026, 2:45 PM" },
  },
})[0]?.json;
const installSms = buildSms({
  body: {
    event: "installer_open_route",
    cliente: {
      nome: "STEPHANIE C.",
      telefone: approvedE164,
      endereco_formatado: "3178 WAVERING LN",
    },
    eta: { minutos: 12, chegada_local: "Nov 3, 2026, 3:10 PM" },
  },
})[0]?.json;
check("workflow normalizes the test number", technicalSms?.telefone === approvedE164);
check(
  "technical visit copy stays in english",
  Boolean(technicalSms?.sms_body.includes("technical visit")) &&
    Boolean(technicalSms?.sms_body.includes("CC Shower")),
);
check(
  "installation copy stays in english",
  Boolean(installSms?.sms_body.includes("installation team")) &&
    Boolean(installSms?.sms_body.includes("about 12 minutes")),
);
const invalidWorkflowPhone = buildSms({
  body: {
    event: "installer_open_route",
    cliente: { nome: "STEPHANIE C.", telefone: "abc", endereco_formatado: "3178 WAVERING LN" },
    eta: { minutos: null, chegada_local: null },
  },
})[0]?.json;
check("workflow drops an invalid phone before twilio", invalidWorkflowPhone?.telefone === "");

function payload(event: OpenRouteWebhookPayload["event"]): OpenRouteWebhookPayload {
  return {
    event,
    os_id: "os-test",
    empresa_id: null,
    etapa_atual: event === "technical_visit_open_route" ? "commercial" : "installation",
    cliente: {
      id: "cliente-test",
      nome: "STEPHANIE C.",
      telefone: approvedE164,
      endereco_formatado: "3178 WAVERING LN",
    },
    destino: { latitude: null, longitude: null },
    origem: null,
    eta: {
      minutos: null,
      chegada_local: null,
      chegada_iso: null,
      distancia_milhas: null,
      com_trafego: false,
    },
    equipe_nome: null,
    tecnico_nome: null,
    timezone: "America/New_York",
  };
}

const previousUrl = process.env.N8N_WEBHOOK_OPEN_ROUTE_URL;
const previousSecret = process.env.N8N_WEBHOOK_SECRET;
const previousFetch = globalThis.fetch;
const webhookUrl = "https://n8n.invalid/webhook/ccshower-open-route-eta";

function restoreWebhookEnv() {
  if (previousUrl === undefined) delete process.env.N8N_WEBHOOK_OPEN_ROUTE_URL;
  else process.env.N8N_WEBHOOK_OPEN_ROUTE_URL = previousUrl;
  if (previousSecret === undefined) delete process.env.N8N_WEBHOOK_SECRET;
  else process.env.N8N_WEBHOOK_SECRET = previousSecret;
  globalThis.fetch = previousFetch;
}

process.env.N8N_WEBHOOK_OPEN_ROUTE_URL = webhookUrl;
delete process.env.N8N_WEBHOOK_SECRET;
let fetchCalls = 0;
globalThis.fetch = (async () => {
  fetchCalls += 1;
  return new Response("should-not-send", { status: 500 });
}) as typeof fetch;
const missingSecret = await dispatchOpenRouteWebhook(payload("technical_visit_open_route"));
check(
  "missing secret does not call the webhook",
  missingSecret.ok === false && fetchCalls === 0,
);

process.env.N8N_WEBHOOK_SECRET = "test-webhook-secret";
delete process.env.N8N_WEBHOOK_OPEN_ROUTE_URL;
fetchCalls = 0;
const missingUrl = await dispatchOpenRouteWebhook(payload("installer_open_route"));
check("missing url does not call the webhook", missingUrl.ok === false && fetchCalls === 0);

process.env.N8N_WEBHOOK_OPEN_ROUTE_URL = webhookUrl;
let seenAuthorization = "";
let seenBody = "";
globalThis.fetch = (async (input, init) => {
  fetchCalls += 1;
  seenAuthorization = new Headers(init?.headers).get("authorization") ?? "";
  seenBody = String(init?.body ?? "");
  return new Response("upstream unavailable", { status: 502 });
}) as typeof fetch;
fetchCalls = 0;
const failedWebhook = await dispatchOpenRouteWebhook(payload("installer_open_route"));
check(
  "webhook http failure is not queued",
  failedWebhook.ok === false &&
    fetchCalls === 1 &&
    seenAuthorization === "Bearer test-webhook-secret" &&
    seenBody.includes(approvedE164),
);

globalThis.fetch = (async () => {
  throw new Error("network down");
}) as typeof fetch;
const thrownWebhook = await dispatchOpenRouteWebhook(payload("technical_visit_open_route"));
check("webhook network failure is not queued", thrownWebhook.ok === false);

globalThis.fetch = (async () => new Response("{}", { status: 200 })) as typeof fetch;
const acceptedWebhook = await dispatchOpenRouteWebhook(payload("technical_visit_open_route"));
check("webhook success stays local to the mock", acceptedWebhook.ok === true);

restoreWebhookEnv();

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("open route sms checks passed");
