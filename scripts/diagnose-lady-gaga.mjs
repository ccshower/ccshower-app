import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) throw new Error(".env.local não encontrado");
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: clientes } = await admin.from("clientes").select("id, nome").ilike("nome", "%gaga%");
const ids = (clientes ?? []).map((c) => c.id);

const { data: osRows } = await admin
  .from("ordens_servico")
  .select(
    "id, titulo, etapa_atual, status, status_atual, financial_decision, valor_final, valor_comercial, valor_projeto, visit_payment_received, visit_payment_amount, visit_payment_method, atualizado_em",
  )
  .in("cliente_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

console.log(JSON.stringify({ clientes, osRows }, null, 2));
