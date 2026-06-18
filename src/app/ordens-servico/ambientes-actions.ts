"use server";

import { revalidatePath } from "next/cache";

import { verificarOsFluxoLiberado } from "@/app/ordens-servico/bloqueio-operacional-actions";
import {
  OS_AMBIENTES_MAX,
  parseAmbienteValorInput,
  type OsAmbienteFormRow,
} from "@/lib/ordens-servico/os-ambientes";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import { OS_ANEXO_TIPO_VISITA } from "@/lib/ordens-servico/visita-comercial";
import { createClient } from "@/lib/supabase/server";
import type { OsAmbiente } from "@/lib/types/database";

export type ActionResult =
  | { ok: true; id?: string; ambientes?: OsAmbiente[] }
  | { ok: false; message: string };

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired");
  return { supabase, userId: user.id };
}

function revalidateOs(osId: string) {
  revalidatePath("/ordens-servico");
  revalidatePath("/admin/centro-operacional");
  revalidatePath("/operacao");
  revalidatePath("/os", "layout");
  revalidatePath(`/os/${osId}`);
}

export async function listarAmbientesOs(
  osId: string,
): Promise<{ ambientes: OsAmbiente[]; error?: string }> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("os_ambientes")
      .select("*")
      .eq("ordem_servico_id", osId)
      .eq("ativo", true)
      .order("sort_order", { ascending: true })
      .order("criado_em", { ascending: true });

    if (error) return { ambientes: [], error: error.message };
    return { ambientes: (data ?? []) as OsAmbiente[] };
  } catch (e) {
    return {
      ambientes: [],
      error: e instanceof Error ? e.message : "Error loading environments",
    };
  }
}

export async function salvarAmbientesComercial(
  osId: string,
  rows: OsAmbienteFormRow[],
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const bloqueio = await verificarOsFluxoLiberado(supabase, osId);
    if (bloqueio) return bloqueio;

    const { data: os, error: osErr } = await supabase
      .from("ordens_servico")
      .select("id, empresa_id, etapa_atual")
      .eq("id", osId)
      .single();

    if (osErr || !os) {
      return { ok: false, message: osErr?.message ?? "Work order not found" };
    }

    if (parseOsStage(os.etapa_atual as string) !== "commercial") {
      return { ok: false, message: "Work order is not in the commercial stage" };
    }

    if (rows.length > OS_AMBIENTES_MAX) {
      return {
        ok: false,
        message: `Maximum ${OS_AMBIENTES_MAX} environments per work order`,
      };
    }

    const trimmed = rows
      .map((row, index) => ({
        id: row.id.trim(),
        nome: row.nome.trim(),
        especificacoes: row.especificacoes.trim(),
        valor_comercial: parseAmbienteValorInput(row.valor_comercial),
        sort_order: index,
      }))
      .filter((row) => row.nome.length > 0);

    for (const row of trimmed) {
      if (!row.id) {
        return { ok: false, message: "Invalid environment id" };
      }
    }

    const keepIds = trimmed.map((r) => r.id);

    const { data: existing } = await supabase
      .from("os_ambientes")
      .select("id")
      .eq("ordem_servico_id", osId)
      .eq("ativo", true);

    const toDeactivate = (existing ?? [])
      .map((r) => r.id as string)
      .filter((id) => !keepIds.includes(id));

    if (toDeactivate.length > 0) {
      const { error: deactErr } = await supabase
        .from("os_ambientes")
        .update({ ativo: false })
        .in("id", toDeactivate);
      if (deactErr) return { ok: false, message: deactErr.message };
    }

    const empresaId = os.empresa_id as string | null;

    for (const row of trimmed) {
      const payload = {
        ordem_servico_id: osId,
        empresa_id: empresaId,
        nome: row.nome,
        especificacoes: row.especificacoes || null,
        valor_comercial: row.valor_comercial,
        sort_order: row.sort_order,
        ativo: true,
      };

      const { data: found } = await supabase
        .from("os_ambientes")
        .select("id")
        .eq("id", row.id)
        .maybeSingle();

      if (found?.id) {
        const { error: updErr } = await supabase
          .from("os_ambientes")
          .update(payload)
          .eq("id", row.id);
        if (updErr) return { ok: false, message: updErr.message };
      } else {
        const { error: insErr } = await supabase.from("os_ambientes").insert({
          id: row.id,
          ...payload,
        });
        if (insErr) return { ok: false, message: insErr.message };
      }
    }

    const { ambientes } = await listarAmbientesOs(osId);
    revalidateOs(osId);
    return { ok: true, id: osId, ambientes };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error saving environments",
    };
  }
}

export async function validarFotosVisitaObrigatorias(
  supabase: Awaited<ReturnType<typeof createClient>>,
  osId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const [{ data: ambientes }, { data: anexos }] = await Promise.all([
    supabase
      .from("os_ambientes")
      .select("id, nome")
      .eq("ordem_servico_id", osId)
      .eq("ativo", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("os_anexos")
      .select("os_ambiente_id")
      .eq("ordem_servico_id", osId)
      .eq("tipo", OS_ANEXO_TIPO_VISITA),
  ]);

  const listaAnexos = anexos ?? [];
  const listaAmbientes = ambientes ?? [];

  if (listaAmbientes.length === 0) {
    if (listaAnexos.length === 0) {
      return {
        ok: false,
        message: "Add at least one visit photo before finishing",
      };
    }
    return { ok: true };
  }

  for (const amb of listaAmbientes) {
    const count = listaAnexos.filter(
      (a) => a.os_ambiente_id === amb.id,
    ).length;
    if (count === 0) {
      const nome = (amb.nome as string)?.trim() || "Environment";
      return {
        ok: false,
        message: `${nome}: add at least one photo (required for project)`,
      };
    }
  }

  return { ok: true };
}
