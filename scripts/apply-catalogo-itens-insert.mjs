/**
 * Aplica RLS insert/update em catalogo_itens (equipe Projeto).
 *
 * Uso: node scripts/apply-catalogo-itens-insert.mjs
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

const env = loadEnv();
const sqlPath = resolve(
  process.cwd(),
  "supabase/scripts/catch-up-catalogo-itens-insert.sql",
);
const SQL = readFileSync(sqlPath, "utf8");

let connectionString = env.DATABASE_URL;
if (!connectionString && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_DB_PASSWORD) {
  const host = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.replace(
    "supabase.co",
    "pooler.supabase.com",
  );
  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.match(
    /https:\/\/([^.]+)\.supabase\.co/,
  )?.[1];
  connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
}

if (!connectionString) {
  console.error(
    "Defina DATABASE_URL ou SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL em .env.local",
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(SQL);
  console.log("OK: políticas de catalogo_itens aplicadas.");
} finally {
  await client.end();
}
