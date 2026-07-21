/**
 * Aplica a RLS de edição do cliente antes do agendamento da visita.
 * Uso: node scripts/apply-cliente-primeira-visita-rls.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import pg from "pg";

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

const SQL = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260721120000_cliente_primeira_visita_rls.sql"),
  "utf8",
);

const env = loadEnv();
const url = env.DATABASE_URL;
const password = env.SUPABASE_DB_PASSWORD;
const projectUrl = env.NEXT_PUBLIC_SUPABASE_URL;

let connectionString = url;
if (!connectionString && password && projectUrl) {
  const ref = projectUrl.replace("https://", "").split(".")[0];
  connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
}

if (!connectionString) {
  console.error("Defina DATABASE_URL ou SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL em .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(SQL);
  console.log("RLS de edição do cliente (antes do agendamento) aplicada com sucesso.");
} finally {
  await client.end();
}
