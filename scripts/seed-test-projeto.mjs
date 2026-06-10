/**
 * Uso: node scripts/seed-test-projeto.mjs
 * Cria ou atualiza paloma@teste.com (equipe Projeto) na Auth + public.usuarios.
 *
 * Se createUser falhar (limite/trigger no Supabase), reaproveita edgar@teste.com.
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

const EMAIL = "paloma@teste.com";
const PASSWORD = "123456";
const NOME = "Paloma Projeto";
/** Conta existente na equipe Projeto — reaproveitada se createUser falhar. */
const REPURPOSE_EMAIL = "edgar@teste.com";

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

async function listAllAuthUsers() {
  const users = [];
  let page = 1;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) break;
    page++;
  }
  return users;
}

async function findAuthUserByEmail(email) {
  const users = await listAllAuthUsers();
  return users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function resolveEquipeProjeto() {
  const { data, error } = await admin
    .from("equipes")
    .select("id, nome, codigo_operacional, unidade_id, ativo")
    .eq("codigo_operacional", "project")
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error('Equipe "project" não encontrada. Verifique public.equipes.');
  }
  return data;
}

async function upsertUsuarioRow(userId, equipe) {
  const row = {
    id: userId,
    nome: NOME,
    email: EMAIL,
    telefone: null,
    equipe_id: equipe.id,
    unidade_id: equipe.unidade_id ?? null,
    tipo_usuario: "user",
    pode_editar_agenda: false,
    pode_ver_todas_equipes: false,
    pode_gerenciar_estoque: false,
    pode_resolver_crash: false,
    ativo: true,
  };

  const { error: upErr } = await admin.from("usuarios").upsert(row, { onConflict: "id" });
  if (upErr) throw upErr;
}

async function main() {
  const equipe = await resolveEquipeProjeto();
  let user = await findAuthUserByEmail(EMAIL);

  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    console.log("Auth: paloma@teste.com já existia — senha atualizada.");
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });

    if (error) {
      console.warn("createUser falhou — reaproveitando", REPURPOSE_EMAIL);
      const donor = await findAuthUserByEmail(REPURPOSE_EMAIL);
      if (!donor) {
        throw new Error(
          `Não foi possível criar ${EMAIL} nem encontrar ${REPURPOSE_EMAIL} para reaproveitar.`,
        );
      }
      const { data: updated, error: upErr } = await admin.auth.admin.updateUserById(donor.id, {
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
      });
      if (upErr) throw upErr;
      user = updated.user;
      console.log(`Auth: ${REPURPOSE_EMAIL} convertido para ${EMAIL}.`);
    } else {
      user = data.user;
      console.log("Auth: usuário criado.");
    }
  }

  await upsertUsuarioRow(user.id, equipe);

  console.log("public.usuarios: perfil de campo vinculado à equipe Projeto.");
  console.log("");
  console.log("Equipe:", equipe.nome, `(${equipe.id})`);
  console.log("Unidade:", equipe.unidade_id ?? "(matriz via trigger)");
  console.log("");
  console.log("Login:");
  console.log("  E-mail:", EMAIL);
  console.log("  Senha:", PASSWORD);
  console.log("  Home esperada: /operacao");
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
