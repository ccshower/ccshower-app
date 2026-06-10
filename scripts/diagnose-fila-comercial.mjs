/**
 * Diagnóstico: fila comercial (SEM VISITA)
 * Uso: node scripts/diagnose-fila-comercial.mjs
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

const { data: osRows } = await admin
  .from("ordens_servico")
  .select("id, cliente_id, criado_em, titulo, equipe_id, equipe_atual_id")
  .eq("ativo", true)
  .eq("etapa_atual", "commercial")
  .eq("status_atual", "no_visit")
  .order("criado_em", { ascending: true });

console.log(JSON.stringify({ filaComercial: osRows?.length ?? 0, itens: osRows ?? [] }, null, 2));
