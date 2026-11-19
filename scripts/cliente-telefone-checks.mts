import { readFileSync } from "node:fs";

import { parseClienteContractorFromForm } from "../src/lib/clientes/cliente-contractor.ts";
import {
  resolveClienteSmsConsent,
  telefoneClienteObrigatorio,
  tipoClienteNaPrimeiraVisita,
  validarTelefoneCliente,
} from "../src/lib/clientes/cliente-telefone.ts";
import type { ClientType } from "../src/lib/clientes/tipo-cliente.ts";
import { decideClientEtaSms } from "../src/lib/ordens-servico/open-route-policy.ts";

const failures: string[] = [];
function check(name: string, ok: boolean) {
  if (!ok) failures.push(name);
}

const phone = "(413) 650-9502";
const e164 = "+14136509502";
const requiredTypes = ["residential", "commercial"] as const;
const optionalTypes = ["architect", "partner", "contractor", "other"] as const;
const allTypes: ClientType[] = [...requiredTypes, ...optionalTypes];

for (const tipo of requiredTypes) {
  const missing = validarTelefoneCliente(tipo, "  ");
  check(`${tipo} without phone is blocked`, missing.ok === false);
  check(`${tipo} phone is required`, telefoneClienteObrigatorio(tipo));
}

for (const tipo of optionalTypes) {
  const missing = validarTelefoneCliente(tipo, "");
  check(
    `${tipo} without phone is stored as null`,
    missing.ok === true && missing.telefone === null,
  );
  check(`${tipo} phone is optional`, telefoneClienteObrigatorio(tipo) === false);
}

for (const tipo of allTypes) {
  const saved = validarTelefoneCliente(tipo, phone);
  check(
    `${tipo} with a valid phone is stored as e164`,
    saved.ok === true && saved.telefone === e164,
  );
}

const contractorId = "11111111-1111-4111-8111-111111111111";
const missingContractor = parseClienteContractorFromForm("contractor", new FormData());
const contractorForm = new FormData();
contractorForm.set("contractor_id", contractorId);
const linkedContractor = parseClienteContractorFromForm("contractor", contractorForm);
check("contractor without contractor_id is blocked", missingContractor.ok === false);
check(
  "contractor with contractor_id is allowed",
  linkedContractor.ok === true && linkedContractor.contractor_id === contractorId,
);
for (const tipo of ["residential", "commercial", "architect", "partner", "other"] as const) {
  const cleared = parseClienteContractorFromForm(tipo, contractorForm);
  check(
    `${tipo} does not keep a contractor_id`,
    cleared.ok === true && cleared.contractor_id === null,
  );
}

const smsForm = new FormData();
smsForm.set("sms_autorizado", "yes");
const stage = {
  stage: "commercial" as const,
  statusAtual: "visit_in_progress",
  osStatus: "in_progress",
};

for (const tipo of allTypes) {
  const saved = validarTelefoneCliente(tipo, phone);
  const consent = resolveClienteSmsConsent(
    smsForm,
    saved.ok ? saved.telefone : null,
    null,
  );
  const queued = decideClientEtaSms({
    ...stage,
    smsAutorizado: consent.fields.sms_autorizado,
    smsConsentimentoEm: consent.fields.sms_consentimento_em,
    smsOptOutEm: consent.fields.sms_opt_out_em,
    telefone: saved.ok ? saved.telefone : null,
  });
  check(
    `${tipo} with valid phone and consent queues sms`,
    consent.fields.sms_autorizado === true &&
      consent.fields.sms_consentimento_metodo === "verbal" &&
      queued.queue === true &&
      queued.telefone === e164,
  );

  const blocked = resolveClienteSmsConsent(smsForm, null, null);
  const missingSms = decideClientEtaSms({
    ...stage,
    smsAutorizado: true,
    smsConsentimentoEm: "2026-10-01T12:00:00.000Z",
    smsOptOutEm: null,
    telefone: null,
  });
  check(
    `${tipo} without a valid phone does not authorize or queue sms`,
    blocked.fields.sms_autorizado === false &&
      missingSms.queue === false &&
      missingSms.message === "Customer phone missing",
  );
}

const previousStop = {
  telefone: e164,
  sms_autorizado: true,
  sms_consentimento_em: "2026-10-01T12:00:00.000Z",
  sms_consentimento_metodo: "verbal",
  sms_opt_out_em: "2026-10-02T12:00:00.000Z",
  sms_opt_out_origem: "stop",
};
const smsClearedPhone = resolveClienteSmsConsent(smsForm, null, previousStop);
check(
  "clearing the phone keeps stop history and turns sms off",
  smsClearedPhone.fields.sms_autorizado === false &&
    smsClearedPhone.fields.sms_opt_out_em === previousStop.sms_opt_out_em &&
    smsClearedPhone.fields.sms_opt_out_origem === "stop",
);

const criarCliente = readFileSync(
  new URL("../src/app/admin/clientes/actions.ts", import.meta.url),
  "utf8",
);
check(
  "creating a customer still inserts the initial work order",
  criarCliente.includes('.from("ordens_servico").insert('),
);
check(
  "customer save does not read the contractor phone",
  !criarCliente.includes("contractors") || !/from\("contractors"\)/.test(criarCliente),
);

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20261119190000_cliente_telefone_opcional_contractor.sql",
    import.meta.url,
  ),
  "utf8",
);
check("migration drops the phone not-null rule", /alter column telefone drop not null/i.test(migration));
check(
  "migration requires a phone only for residential and commercial",
  migration.includes("tipo_cliente in ('residential', 'commercial')") &&
    migration.includes("btrim(telefone) <> ''"),
);
check(
  "migration still requires contractor_id for contractor customers",
  migration.includes("tipo_cliente = 'contractor'") &&
    migration.includes("contractor_id is not null"),
);
check(
  "primeira visita does not turn a residential customer into a contractor to skip the phone",
  tipoClienteNaPrimeiraVisita("residential", "contractor") === "residential" &&
    validarTelefoneCliente("residential", "").ok === false,
);
check(
  "primeira visita can change residential to architect and then omit the phone",
  tipoClienteNaPrimeiraVisita("residential", "architect") === "architect" &&
    validarTelefoneCliente("architect", "").ok === true,
);
check(
  "primeira visita requires a phone when architect becomes residential",
  tipoClienteNaPrimeiraVisita("architect", "residential") === "residential" &&
    validarTelefoneCliente("residential", "").ok === false,
);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("cliente telefone checks passed");
