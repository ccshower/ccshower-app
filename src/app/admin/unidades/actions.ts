"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { PRODUCAO_MENSAL_META } from "@/lib/centro-operacional/producao-mensal";

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

function parseMetaProducaoMensal(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned.length) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
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
    const metaRaw = String(formData.get("meta_producao_mensal") ?? "");
    const metaParsed = parseMetaProducaoMensal(metaRaw);
    const meta_producao_mensal =
      metaParsed ?? (metaRaw.trim() ? null : PRODUCAO_MENSAL_META);
    if (meta_producao_mensal === null) {
      return { ok: false, message: "Monthly goal must be a valid amount" };
    }
    const { error } = await supabase.from("unidades").insert({
      nome,
      timezone,
      meta_producao_mensal,
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
    const metaParsed = parseMetaProducaoMensal(
      String(formData.get("meta_producao_mensal") ?? ""),
    );
    if (metaParsed === null) {
      return { ok: false, message: "Monthly goal must be a valid amount" };
    }

    if (matriz) {
      await clearMatrizFlag(supabase);
    }

    const { error } = await supabase
      .from("unidades")
      .update({ nome, timezone, matriz, meta_producao_mensal: metaParsed })
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
