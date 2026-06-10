/**
 * Uso único: node scripts/seed-test-admin.mjs
 * Cria ou atualiza admin@teste.com.br na Auth + public.usuarios
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

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

const EMAIL = "admin@teste.com.br";
const PASSWORD = "123456";
const NOME = "Admin Teste";

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase()) ?? null;
}

async function main() {
  let user = await findUserByEmail();

  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    console.log("Auth: usuário já existia — senha atualizada e e-mail confirmado.");
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    console.log("Auth: usuário criado.");
  }

  const row = {
    id: user.id,
    nome: NOME,
    email: EMAIL,
    telefone: null,
    equipe_id: null,
    tipo_usuario: "admin",
    pode_editar_agenda: true,
    pode_ver_todas_equipes: true,
    pode_gerenciar_estoque: true,
    pode_resolver_crash: true,
    ativo: true,
  };

  const { error: upErr } = await admin.from("usuarios").upsert(row, { onConflict: "id" });
  if (upErr) throw upErr;

  console.log("public.usuarios: perfil admin ativo.");
  console.log("");
  console.log("Login:");
  console.log("  E-mail:", EMAIL);
  console.log("  Senha:", PASSWORD);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
