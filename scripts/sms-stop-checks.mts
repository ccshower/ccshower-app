import { createHmac } from "node:crypto";

import {
  hasValidSmsConsent,
  isStopKeyword,
  recordSmsStop,
  resolveSmsConsentWrite,
} from "../src/lib/clientes/sms-consent.ts";
import { handleSmsStopRequest } from "../src/lib/sms/sms-stop-request.ts";
import {
  twilioSmsStopWebhookUrl,
  validateTwilioFormSignature,
} from "../src/lib/sms/twilio-signature.ts";

const failures: string[] = [];
function check(name: string, ok: boolean) {
  if (!ok) failures.push(name);
}

const token = "test-auth-token-not-a-real-secret";
const origin = "https://ccshower.test";
const url = `${origin}/api/webhooks/n8n/sms-stop`;

function sign(params: Record<string, string>, signedUrl = url) {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], signedUrl);
  return createHmac("sha1", token).update(Buffer.from(data, "utf-8")).digest("base64");
}

const stopParams = {
  From: "+13214407819",
  Body: "STOP",
  MessageSid: "SM1",
  AccountSid: "ACexample",
};

check(
  "valid signature",
  validateTwilioFormSignature({
    authToken: token,
    signature: sign(stopParams),
    url,
    params: stopParams,
  }),
);
check(
  "invalid signature",
  validateTwilioFormSignature({
    authToken: token,
    signature: "bm90LWEtcmVhbC1zaWduYXR1cmU=",
    url,
    params: stopParams,
  }) === false,
);
check(
  "missing credential",
  validateTwilioFormSignature({
    authToken: undefined,
    signature: sign(stopParams),
    url,
    params: stopParams,
  }) === false,
);
check("webhook url from server origin", twilioSmsStopWebhookUrl(origin) === url);
check(
  "client supplied path is not the signed url",
  twilioSmsStopWebhookUrl("https://evil.example/hook") === null,
);
check(
  "signature for another url fails",
  validateTwilioFormSignature({
    authToken: token,
    signature: sign(stopParams, "https://evil.example/api/webhooks/n8n/sms-stop"),
    url,
    params: stopParams,
  }) === false,
);

function formRequest(bodyParams: Record<string, string>, headers: Record<string, string>) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: new URLSearchParams(bodyParams).toString(),
  });
}

async function runRoute() {
  const prevToken = process.env.TWILIO_AUTH_TOKEN;
  const prevBase = process.env.APP_BASE_URL;
  process.env.TWILIO_AUTH_TOKEN = token;
  process.env.APP_BASE_URL = origin;

  const calls: string[] = [];
  const recordStop = async (telefone: string) => {
    calls.push(telefone);
    return { ok: true as const, updated: 1 };
  };
  const n8nAuthorized = (request: Request) =>
    request.headers.get("authorization") === "Bearer test-n8n-secret";

  const ok = await handleSmsStopRequest(
    formRequest(stopParams, { "x-twilio-signature": sign(stopParams) }),
    { recordStop, n8nAuthorized },
  );
  const okBody = await ok.json();
  check(
    "twilio stop recorded",
    ok.status === 200 && okBody.updated === 1 && calls[0] === "+13214407819",
  );

  calls.length = 0;
  const bad = await handleSmsStopRequest(
    formRequest(stopParams, { "x-twilio-signature": "bad-signature" }),
    { recordStop, n8nAuthorized },
  );
  check("invalid signature rejected", bad.status === 401 && calls.length === 0);

  delete process.env.TWILIO_AUTH_TOKEN;
  calls.length = 0;
  const missing = await handleSmsStopRequest(
    formRequest(stopParams, { "x-twilio-signature": sign(stopParams) }),
    { recordStop, n8nAuthorized },
  );
  check("missing credential rejected", missing.status === 401 && calls.length === 0);
  process.env.TWILIO_AUTH_TOKEN = token;

  calls.length = 0;
  const both = await handleSmsStopRequest(
    formRequest(stopParams, {
      "x-twilio-signature": "bad-signature",
      authorization: "Bearer test-n8n-secret",
    }),
    { recordStop, n8nAuthorized },
  );
  check("twilio header does not fall back to n8n", both.status === 401 && calls.length === 0);

  const helloParams = { ...stopParams, Body: "Hello there" };
  calls.length = 0;
  const hello = await handleSmsStopRequest(
    formRequest(helloParams, { "x-twilio-signature": sign(helloParams) }),
    { recordStop, n8nAuthorized },
  );
  const helloBody = await hello.json();
  check(
    "ordinary message ignored",
    hello.status === 200 && helloBody.updated === 0 && calls.length === 0,
  );

  calls.length = 0;
  const n8n = await handleSmsStopRequest(
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer test-n8n-secret",
      },
      body: JSON.stringify({ From: "+13214407819", Body: "stop" }),
    }),
    { recordStop, n8nAuthorized },
  );
  const n8nBody = await n8n.json();
  check(
    "n8n authorized stop",
    n8n.status === 200 && n8nBody.updated === 1 && calls.at(-1) === "+13214407819",
  );

  calls.length = 0;
  const anon = await handleSmsStopRequest(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ From: "+13214407819", Body: "STOP" }),
    }),
    { recordStop, n8nAuthorized },
  );
  check("unauthenticated rejected", anon.status === 401 && calls.length === 0);

  if (prevToken === undefined) delete process.env.TWILIO_AUTH_TOKEN;
  else process.env.TWILIO_AUTH_TOKEN = prevToken;
  if (prevBase === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = prevBase;
}

function keywordChecks() {
  for (const word of ["STOP", "stop", "STOPALL", "unsubscribe", "Cancel", "end", "QUIT", "STOP."]) {
    check(`keyword ${word}`, isStopKeyword(word));
  }
  check("not keyword", isStopKeyword("hello") === false && isStopKeyword("HELP") === false);
}

function optOutChecks() {
  const previous = {
    telefone: "3214407819",
    sms_autorizado: true,
    sms_consentimento_em: "2026-10-01T12:00:00.000Z",
    sms_consentimento_metodo: "verbal",
    sms_opt_out_em: "2026-10-20T12:00:00.000Z",
    sms_opt_out_origem: "stop",
  };
  const retry = resolveSmsConsentWrite({
    choice: "yes",
    nextTelefone: "3210000000",
    previous,
    now: new Date("2026-10-28T12:00:00.000Z"),
  });
  check(
    "checkbox cannot clear stop",
    retry.fields.sms_autorizado === false &&
      retry.fields.sms_opt_out_em === previous.sms_opt_out_em &&
      retry.fields.sms_opt_out_origem === "stop" &&
      retry.fields.sms_consentimento_em === previous.sms_consentimento_em,
  );
  check(
    "send blocked after opt-out",
    hasValidSmsConsent({
      smsAutorizado: true,
      smsConsentimentoEm: previous.sms_consentimento_em,
      smsOptOutEm: previous.sms_opt_out_em,
    }) === false,
  );
}

async function recordCheck() {
  const updates: Array<Record<string, unknown>> = [];
  const fake = {
    from() {
      return {
        select() {
          return {
            ilike: async () => ({
              data: [{ id: "c1", telefone: "+1 (321) 440-7819" }],
              error: null,
            }),
          };
        },
        update(values: Record<string, unknown>) {
          updates.push(values);
          return { in: async () => ({ error: null }) };
        },
      };
    },
  };
  const result = await recordSmsStop(
    fake,
    "+13214407819",
    new Date("2026-10-28T15:00:00.000Z"),
  );
  check(
    "opt-out columns",
    result.ok === true &&
      result.updated === 1 &&
      updates[0]?.sms_autorizado === false &&
      updates[0]?.sms_opt_out_origem === "stop" &&
      updates[0]?.sms_opt_out_em === "2026-10-28T15:00:00.000Z",
  );
}

await runRoute();
keywordChecks();
optOutChecks();
await recordCheck();

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("sms stop checks passed");
