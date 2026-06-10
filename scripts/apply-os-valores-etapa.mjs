/**
 * Aplica colunas valor_comercial / valor_projeto / valor_final em ordens_servico.
 *
 * Uso:
 *   node scripts/apply-os-valores-etapa.mjs
 *
 * Requer em .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_DB_PASSWORD   (Settings → Database → password)
 *
 * Ou DATABASE_URL completa (Connection string → URI).
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import pg from "pg";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    throw new Error(".env.local não encontrado");
  }
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

const SQL = `
alter table public.ordens_servico
  add column if not exists valor_comercial numeric(12, 2),
  add column if not exists valor_projeto numeric(12, 2),
  add column if not exists valor_final numeric(12, 2);
`;

const env = loadEnv();

function resolveDatabaseUrl() {
  if (env.DATABASE_URL?.trim()) return env.DATABASE_URL.trim();

  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const password = env.SUPABASE_DB_PASSWORD?.trim();
  if (!url || !password) {
    throw new Error(
      "Defina SUPABASE_DB_PASSWORD ou DATABASE_URL em .env.local (Supabase → Project Settings → Database).",
    );
  }
  const ref = url.match(/https:\/\/([^.]+)\./)?.[1];
  if (!ref) throw new Error("NEXT_PUBLIC_SUPABASE_URL inválida");
  const encoded = encodeURIComponent(password);
  return `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`;
}

const client = new pg.Client({
  connectionString: resolveDatabaseUrl(),
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(SQL);
  console.log("Migration aplicada: valor_comercial, valor_projeto, valor_final.");
} catch (e) {
  console.error("Falha ao aplicar migration:", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await client.end();
}
