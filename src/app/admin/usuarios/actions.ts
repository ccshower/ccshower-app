"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { TipoUsuario } from "@/lib/types/database";
import { isValidTipoUsuario, permissoesParaTipoUsuario } from "@/lib/auth/tipo-usuario";

async function requireAdminSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Sessão expirada");
  }
  const { data: row, error } = await supabase
    .from("usuarios")
    .select("tipo_usuario, ativo")
    .eq("id", user.id)
    .single();
  if (error || !row?.ativo || row.tipo_usuario !== "admin") {
    throw new Error("Sem permissão");
  }
  return supabase;
}

export type ActionResult = { ok: true } | { ok: false; message: string };

function readBool(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function emptyToNull(v: string) {
  const t = v.trim();
  return t.length ? t : null;
}

export async function criarUsuario(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminSupabase();
    const admin = createAdminClient();

    const nome = String(formData.get("nome") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const telefone = emptyToNull(String(formData.get("telefone") ?? ""));
    const equipe_id = emptyToNull(String(formData.get("equipe_id") ?? ""));
    const unidade_id = emptyToNull(String(formData.get("unidade_id") ?? ""));
    const tipo_usuario = String(formData.get("tipo_usuario") ?? "comum") as TipoUsuario;

    if (!nome || !email || !password) {
      return { ok: false, message: "Nome, e-mail e senha são obrigatórios" };
    }
    if (password.length < 6) {
      return { ok: false, message: "Senha com pelo menos 6 caracteres" };
    }
    if (!isValidTipoUsuario(tipo_usuario)) {
      return { ok: false, message: "Tipo de usuário inválido" };
    }

    const permissoes = permissoesParaTipoUsuario(tipo_usuario, {
      pode_editar_agenda: readBool(formData, "pode_editar_agenda"),
      pode_ver_todas_equipes: readBool(formData, "pode_ver_todas_equipes"),
      pode_gerenciar_estoque: readBool(formData, "pode_gerenciar_estoque"),
      pode_resolver_crash: readBool(formData, "pode_resolver_crash"),
    });

    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authErr || !created.user) {
      return { ok: false, message: authErr?.message ?? "Erro ao criar login" };
    }

    const updates = {
      nome,
      email,
      telefone,
      equipe_id,
      ...(unidade_id ? { unidade_id } : {}),
      tipo_usuario,
      ...permissoes,
      ativo: true,
    };

    const { error: upErr, data: updated } = await admin
      .from("usuarios")
      .update(updates)
      .eq("id", created.user.id)
      .select("id")
      .maybeSingle();

    if (upErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return { ok: false, message: upErr.message };
    }

    if (!updated) {
      await admin.auth.admin.deleteUser(created.user.id);
      return {
        ok: false,
        message:
          "Não foi possível atualizar public.usuarios após criar o login. Confirme se o trigger em auth.users cria a linha em usuarios.",
      };
    }

    revalidatePath("/admin/usuarios");
    revalidatePath("/");
    revalidatePath("/operacao");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar usuário";
    return { ok: false, message: msg };
  }
}

export async function atualizarUsuario(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdminSupabase();
    const admin = createAdminClient();

    const id = String(formData.get("id") ?? "");
    if (!id) {
      return { ok: false, message: "ID ausente" };
    }

    const nome = String(formData.get("nome") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const telefone = emptyToNull(String(formData.get("telefone") ?? ""));
    const equipe_id = emptyToNull(String(formData.get("equipe_id") ?? ""));
    const unidade_id = emptyToNull(String(formData.get("unidade_id") ?? ""));
    const tipo_usuario = String(formData.get("tipo_usuario") ?? "comum") as TipoUsuario;
    const password = String(formData.get("password") ?? "").trim();

    if (!nome || !email) {
      return { ok: false, message: "Nome e e-mail são obrigatórios" };
    }
    if (!isValidTipoUsuario(tipo_usuario)) {
      return { ok: false, message: "Tipo de usuário inválido" };
    }
    if (password && password.length < 6) {
      return { ok: false, message: "Senha deve ter pelo menos 6 caracteres" };
    }

    const permissoes = permissoesParaTipoUsuario(tipo_usuario, {
      pode_editar_agenda: readBool(formData, "pode_editar_agenda"),
      pode_ver_todas_equipes: readBool(formData, "pode_ver_todas_equipes"),
      pode_gerenciar_estoque: readBool(formData, "pode_gerenciar_estoque"),
      pode_resolver_crash: readBool(formData, "pode_resolver_crash"),
    });

    const { error: upAuth } = await admin.auth.admin.updateUserById(id, {
      email,
      ...(password.length >= 6 ? { password } : {}),
    });
    if (upAuth) {
      return { ok: false, message: upAuth.message };
    }

    const { error: upRow } = await supabase
      .from("usuarios")
      .update({
        nome,
        email,
        telefone,
        equipe_id,
        ...(unidade_id ? { unidade_id } : {}),
        tipo_usuario,
        ...permissoes,
      })
      .eq("id", id);

    if (upRow) {
      return { ok: false, message: upRow.message };
    }

    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar usuário";
    return { ok: false, message: msg };
  }
}

export async function setUsuarioAtivo(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  try {
    const supabase = await requireAdminSupabase();
    const { error } = await supabase.from("usuarios").update({ ativo }).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }
    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar status";
    return { ok: false, message: msg };
  }
}
