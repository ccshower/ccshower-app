"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { isAdminOrManager } from "@/lib/auth/tipo-usuario";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function emptyToNull(v: FormDataEntryValue | null) {
  const t = String(v ?? "").trim();
  return t.length ? t : null;
}

async function requireAdminSupabase() {
  const { usuario } = await getCurrentUsuario();
  if (!usuario?.ativo || !isAdminOrManager(usuario)) {
    throw new Error("Sem permissao");
  }
  return createClient();
}

function mapDbError(message: string): string {
  if (message.includes("contractors")) {
    return "Database out of date: apply migration supabase/migrations/20250625150000_contractors.sql in Supabase.";
  }
  return message;
}

export async function criarContractor(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdminSupabase();
    const nome = String(formData.get("nome") ?? "").trim();
    if (!nome) return { ok: false, message: "Name is required" };

    const { data, error } = await supabase
      .from("contractors")
      .insert({
        nome,
        telefone: emptyToNull(formData.get("telefone")),
        email: emptyToNull(formData.get("email")),
        ativo: true,
      })
      .select("id")
      .single();

    if (error) return { ok: false, message: mapDbError(error.message) };
    revalidatePath("/admin/contractors");
    revalidatePath("/clientes");
    revalidatePath("/admin/centro-operacional");
    return { ok: true, id: data.id as string };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error creating contractor",
    };
  }
}

export async function atualizarContractor(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireAdminSupabase();
    const id = String(formData.get("id") ?? "").trim();
    const nome = String(formData.get("nome") ?? "").trim();
    if (!id) return { ok: false, message: "ID missing" };
    if (!nome) return { ok: false, message: "Name is required" };

    const { error } = await supabase
      .from("contractors")
      .update({
        nome,
        telefone: emptyToNull(formData.get("telefone")),
        email: emptyToNull(formData.get("email")),
      })
      .eq("id", id);

    if (error) return { ok: false, message: mapDbError(error.message) };
    revalidatePath("/admin/contractors");
    revalidatePath("/clientes");
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error updating contractor",
    };
  }
}

export async function setContractorAtivo(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  try {
    const supabase = await requireAdminSupabase();
    const { error } = await supabase.from("contractors").update({ ativo }).eq("id", id);
    if (error) return { ok: false, message: mapDbError(error.message) };
    revalidatePath("/admin/contractors");
    revalidatePath("/clientes");
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error updating contractor",
    };
  }
}
