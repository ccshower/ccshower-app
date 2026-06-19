"use server";

import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/auth/is-admin";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import {
  validarDescontoOrdemServico,
} from "@/lib/ordens-servico/os-desconto";
import { valorContratadoEfetivo } from "@/lib/ordens-servico/os-valores-etapa";
import { createClient } from "@/lib/supabase/server";
import type { Usuario } from "@/lib/types/database";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function revalidateOs(osId: string) {
  revalidatePath("/ordens-servico");
  revalidatePath("/admin/centro-operacional");
  revalidatePath("/operacao");
  revalidatePath("/financeiro");
  revalidatePath("/os", "layout");
  revalidatePath(`/os/${osId}`);
}

async function requireAdminAuth(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired");

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !usuario || !isAdmin(usuario as Usuario)) {
    throw new Error("Only admin can apply a discount.");
  }

  return { supabase, userId: user.id };
}

/** Admin: lança ou atualiza desconto em OS não concluída. */
export async function salvarDescontoOrdemServico(
  osId: string,
  valorRaw: string,
  justificativaRaw: string,
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAdminAuth();
    const id = osId.trim();
    if (!id) return { ok: false, message: "Work order required" };

    const { data: os, error: osErr } = await supabase
      .from("ordens_servico")
      .select(
        "id, status, etapa_atual, valor_final, valor_projeto, valor_comercial, valor_previsto",
      )
      .eq("id", id)
      .single();

    if (osErr || !os) {
      return { ok: false, message: osErr?.message ?? "Work order not found" };
    }

    if (os.status === "completed" || parseOsStage(os.etapa_atual as string) === "completed") {
      return {
        ok: false,
        message: "Cannot apply discount on a completed work order.",
      };
    }

    const valorBruto = valorContratadoEfetivo(os);
    if (valorBruto <= 0) {
      return {
        ok: false,
        message: "Work order has no contract value to discount.",
      };
    }

    const parsed = validarDescontoOrdemServico({
      valorRaw,
      justificativa: justificativaRaw,
      valorBruto,
    });
    if (!parsed.ok) return parsed;

    const { error } = await supabase
      .from("ordens_servico")
      .update({
        desconto_valor: parsed.valor,
        desconto_justificativa: parsed.justificativa,
        desconto_lancado_por: userId,
        desconto_lancado_em: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { ok: false, message: error.message };

    revalidateOs(id);
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error saving discount",
    };
  }
}
