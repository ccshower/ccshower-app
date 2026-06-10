/**
 * Diagnóstico: workspace financeiro operacional
 * Uso: node scripts/diagnose-financeiro-operacional.mjs
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
  .select("id, titulo, cliente_id, valor_final, etapa_atual, status, equipe_atual_id")
  .eq("ativo", true)
  .not("valor_final", "is", null)
  .gt("valor_final", 0)
  .neq("status", "cancelled");

const ids = [...new Set((osRows ?? []).map((r) => r.cliente_id))];
const { data: clientes } = await admin.from("clientes").select("id, nome").in("id", ids);

console.log(
  JSON.stringify(
    {
      osComValor: osRows?.length ?? 0,
      clientes: clientes ?? [],
      amostra: (osRows ?? []).slice(0, 5).map((os) => ({
        ...os,
        clienteNome: clientes?.find((c) => c.id === os.cliente_id)?.nome ?? null,
      })),
    },
    null,
    2,
  ),
);
