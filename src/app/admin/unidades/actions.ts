"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

async function requireAdminSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Session expired");
  }
  const { data: row, error } = await supabase
    .from("usuarios")
    .select("tipo_usuario, ativo")
    .eq("id", user.id)
    .single();
  if (error || !row?.ativo || row.tipo_usuario !== "admin") {
    throw new Error("Not authorized");
  }
  return supabase;
}

const DEFAULT_TIMEZONE = "America/New_York";

function normalizeTimezone(raw: string) {
  const tz = raw.trim();
  return tz.length ? tz : DEFAULT_TIMEZONE;
}

export type ActionResult = { ok: true } | { ok: false; message: string };

async function clearMatrizFlag(supabase: Awaited<ReturnType<typeof requireAdminSupabase>>) {
  const { error } = await supabase
    .from("unidades")
    .update({ matriz: false })
    .eq("matriz", true);
  if (error) {
    throw new Error(error.message);
  }
}

export async function criarUnidade(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdminSupabase();
    const nome = String(formData.get("nome") ?? "").trim();
    if (!nome) {
      return { ok: false, message: "Name is required" };
    }
    const timezone = normalizeTimezone(String(formData.get("timezone") ?? ""));
    const { error } = await supabase.from("unidades").insert({
      nome,
      timezone,
      matriz: false,
      ativo: true,
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    revalidatePath("/admin/centro-operacional");
    revalidatePath("/admin/unidades");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create unit";
    return { ok: false, message: msg };
  }
}

export async function atualizarUnidade(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdminSupabase();
    const id = String(formData.get("id") ?? "");
    if (!id) {
      return { ok: false, message: "Missing ID" };
    }
    const nome = String(formData.get("nome") ?? "").trim();
    if (!nome) {
      return { ok: false, message: "Name is required" };
    }
    const timezone = normalizeTimezone(String(formData.get("timezone") ?? ""));
    const matriz = formData.get("matriz") === "on";

    if (matriz) {
      await clearMatrizFlag(supabase);
    }

    const { error } = await supabase
      .from("unidades")
      .update({ nome, timezone, matriz })
      .eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }
    revalidatePath("/admin/centro-operacional");
    revalidatePath("/admin/unidades");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update unit";
    return { ok: false, message: msg };
  }
}

export async function setUnidadeAtivo(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  try {
    const supabase = await requireAdminSupabase();
    const { data: row, error: readError } = await supabase
      .from("unidades")
      .select("matriz")
      .eq("id", id)
      .single();
    if (readError || !row) {
      return { ok: false, message: readError?.message ?? "Unit not found" };
    }
    if (!ativo && row.matriz) {
      return {
        ok: false,
        message: "Cannot deactivate the HQ unit. Assign another HQ first.",
      };
    }
    const { error } = await supabase.from("unidades").update({ ativo }).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }
    revalidatePath("/admin/centro-operacional");
    revalidatePath("/admin/unidades");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update status";
    return { ok: false, message: msg };
  }
}
