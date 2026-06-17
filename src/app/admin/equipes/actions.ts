"use server";

import { revalidatePath } from "next/cache";

import {
  inferOperationalStageFromTeamName,
  parseOperationalStageCode,
} from "@/lib/equipes/operational-stage-options";
import { createClient } from "@/lib/supabase/server";

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

function normalizeHex(raw: string, fallback: string) {
  const s = raw.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s;
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    const r = s[1];
    const g = s[2];
    const b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

export type ActionResult = { ok: true } | { ok: false; message: string };

function resolveCodigoOperacional(
  formData: FormData,
  nome: string,
): { code: string } | { error: string } {
  const fromForm = parseOperationalStageCode(
    String(formData.get("codigo_operacional") ?? ""),
  );
  if (fromForm) return { code: fromForm };

  const inferred = inferOperationalStageFromTeamName(nome);
  if (inferred) return { code: inferred };

  return {
    error:
      'Operational stage is required (Commercial, Financial, Project, or Installation).',
  };
}

export async function criarEquipe(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdminSupabase();
    const nome = String(formData.get("nome") ?? "").trim();
    if (!nome) {
      return { ok: false, message: "Nome é obrigatório" };
    }
    const cor_primaria = normalizeHex(
      String(formData.get("cor_primaria") ?? ""),
      "#7189a8",
    );
    const cor_secundaria = normalizeHex(
      String(formData.get("cor_secundaria") ?? ""),
      "#e8f0f7",
    );
    const unidade_id = String(formData.get("unidade_id") ?? "").trim() || null;
    const codigo = resolveCodigoOperacional(formData, nome);
    if ("error" in codigo) {
      return { ok: false, message: codigo.error };
    }
    const { error } = await supabase.from("equipes").insert({
      nome,
      cor_primaria,
      cor_secundaria,
      codigo_operacional: codigo.code,
      ...(unidade_id ? { unidade_id } : {}),
      ativo: true,
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    revalidatePath("/admin/equipes");
    revalidatePath("/");
    revalidatePath("/operacao");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar equipe";
    return { ok: false, message: msg };
  }
}

export async function atualizarEquipe(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdminSupabase();
    const id = String(formData.get("id") ?? "");
    if (!id) {
      return { ok: false, message: "ID ausente" };
    }
    const nome = String(formData.get("nome") ?? "").trim();
    if (!nome) {
      return { ok: false, message: "Nome é obrigatório" };
    }
    const cor_primaria = normalizeHex(
      String(formData.get("cor_primaria") ?? ""),
      "#7189a8",
    );
    const cor_secundaria = normalizeHex(
      String(formData.get("cor_secundaria") ?? ""),
      "#e8f0f7",
    );
    const unidade_id = String(formData.get("unidade_id") ?? "").trim() || null;
    const codigo = resolveCodigoOperacional(formData, nome);
    if ("error" in codigo) {
      return { ok: false, message: codigo.error };
    }
    const { error } = await supabase
      .from("equipes")
      .update({
        nome,
        cor_primaria,
        cor_secundaria,
        codigo_operacional: codigo.code,
        ...(unidade_id ? { unidade_id } : {}),
      })
      .eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }
    revalidatePath("/admin/equipes");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar equipe";
    return { ok: false, message: msg };
  }
}

export async function setEquipeAtivo(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  try {
    const supabase = await requireAdminSupabase();
    const { error } = await supabase.from("equipes").update({ ativo }).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }
    revalidatePath("/admin/equipes");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar status";
    return { ok: false, message: msg };
  }
}
