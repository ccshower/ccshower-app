/**
 * Cria equipe Financial (financial_review) no Supabase.
 * Uso: node scripts/apply-financial-equipe.mjs
 */
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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: unidade } = await admin
  .from("unidades")
  .select("id")
  .eq("matriz", true)
  .limit(1)
  .maybeSingle();

const unidadeId = unidade?.id ?? null;

const { data: existing } = await admin
  .from("equipes")
  .select("id, nome")
  .eq("codigo_operacional", "financial_review")
  .eq("ativo", true)
  .limit(1)
  .maybeSingle();

if (existing) {
  console.log("Financial team already exists:", existing);
  process.exit(0);
}

const { data: created, error } = await admin
  .from("equipes")
  .insert({
    nome: "Financial",
    cor_primaria: "#059669",
    cor_secundaria: "#D1FAE5",
    codigo_operacional: "financial_review",
    unidade_id: unidadeId,
    ativo: true,
  })
  .select("id, nome, codigo_operacional")
  .single();

if (error) {
  console.error(error);
  process.exit(1);
}

console.log("Created Financial team:", created);
