"use server";

import { revalidatePath } from "next/cache";

import {
  BLOQUEIO_MATERIAL_RETORNO_PROJETO_EVENTO,
  BLOQUEIO_STATUS_ATIVO,
  BLOQUEIO_STATUS_RESOLVIDO,
  bloqueioMaterialInstalacaoRequerRetornoProjeto,
  isBloqueioOperacionalEtapa,
  motivoBloqueioPermitido,
} from "@/lib/ordens-servico/bloqueio-operacional";
import { spreadAgendaEventoDatetime } from "@/lib/ordens-servico/agenda-evento-query";
import {
  buildOperationalSnapshot,
  parseOsStage,
} from "@/lib/ordens-servico/operacional-snapshot";
import { MENSAGEM_OS_FLUXO_BLOQUEADO } from "@/lib/ordens-servico/os-bloqueio-fluxo";
import { orderStatusOnEnterStage } from "@/lib/ordens-servico/workflow";
import { resolveDefaultTeamForStage } from "@/lib/ordens-servico/workflow-equipe";
import { createClient } from "@/lib/supabase/server";
import type { OsCrash } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function revalidateOs(osId: string) {
  revalidatePath("/ordens-servico");
  revalidatePath("/operacao");
  revalidatePath("/calendar");
  revalidatePath("/os", "layout");
  revalidatePath(`/os/${osId}`);
}

/** Devolve OS da Instalação ao Projeto após bloqueio de material (sem apagar histórico). */
async function retornarOsAoProjetoPorBloqueioMaterialInstalacao(
  supabase: SupabaseClient,
  osId: string,
  userId: string,
): Promise<ActionResult> {
  const { data: os, error: osErr } = await supabase
    .from("ordens_servico")
    .select(
      "id, cliente_id, etapa_atual, equipe_atual_id, equipe_id, responsavel_id, status",
    )
    .eq("id", osId)
    .single();

  if (osErr || !os) {
    return { ok: false, message: osErr?.message ?? "Work order not found" };
  }

  if (parseOsStage(os.etapa_atual as string) !== "installation") {
    return { ok: true, id: osId };
  }

  const equipeFallback =
    (os.equipe_atual_id as string | null) ?? (os.equipe_id as string | null);
  const equipeExecutora = equipeFallback;

  const { equipeId, error: eqErr } = await resolveDefaultTeamForStage(
    supabase,
    "project",
    equipeFallback,
  );

  if (eqErr || !equipeId) {
    return {
      ok: false,
      message: eqErr ?? "Project stage team not configured",
    };
  }

  const statusOrdem = orderStatusOnEnterStage("project");
  const snapshot = buildOperationalSnapshot(equipeId, "project", statusOrdem);

  const { error: updErr } = await supabase
    .from("ordens_servico")
    .update({
      etapa_atual: snapshot.etapa_atual,
      status_atual: snapshot.status_atual,
      equipe_atual_id: snapshot.equipe_atual_id,
      equipe_id: equipeId,
      status: statusOrdem,
    })
    .eq("id", osId);

  if (updErr) return { ok: false, message: updErr.message };

  const when = new Date().toISOString();
  const { error: evErr } = await supabase.from("agenda_eventos").insert({
    ordem_servico_id: osId,
    cliente_id: os.cliente_id as string,
    equipe_id: equipeExecutora ?? equipeId,
    responsavel_id: userId,
    tipo_evento: "stage_changed",
    etapa: "project",
    status: "completed",
    titulo: "stage_changed",
    descricao: BLOQUEIO_MATERIAL_RETORNO_PROJETO_EVENTO,
    ...spreadAgendaEventoDatetime(when),
  });

  if (evErr) return { ok: false, message: evErr.message };

  return { ok: true, id: osId };
}

/** Impede avanço de fluxo enquanto existir bloqueio ativo na OS. */
export async function verificarOsFluxoLiberado(
  supabase: SupabaseClient,
  ordemServicoId: string,
): Promise<ActionResult | null> {
  const { count, error } = await supabase
    .from("os_crashes")
    .select("id", { count: "exact", head: true })
    .eq("ordem_servico_id", ordemServicoId)
    .eq("status", BLOQUEIO_STATUS_ATIVO);

  if (error) {
    return { ok: false, message: error.message };
  }

  if ((count ?? 0) > 0) {
    return { ok: false, message: MENSAGEM_OS_FLUXO_BLOQUEADO };
  }

  return null;
}

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired");
  return { supabase, userId: user.id };
}

export async function registrarBloqueioOperacional(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    const ordem_servico_id = String(formData.get("ordem_servico_id") ?? "").trim();
    const categoria = String(formData.get("categoria") ?? "").trim();
    const motivo = String(formData.get("motivo") ?? "").trim();
    const observacaoRaw = String(formData.get("observacao") ?? "").trim();
    const observacao = observacaoRaw || null;

    if (!ordem_servico_id) {
      return { ok: false, message: "Invalid work order" };
    }
    if (!categoria || !motivo) {
      return { ok: false, message: "Category and reason are required" };
    }

    const { data: os, error: osErr } = await supabase
      .from("ordens_servico")
      .select("id, empresa_id, etapa_atual, status")
      .eq("id", ordem_servico_id)
      .single();

    if (osErr || !os) {
      return { ok: false, message: osErr?.message ?? "Work order not found" };
    }

    if (os.status === "completed" || os.status === "cancelled") {
      return {
        ok: false,
        message: "Cannot register a block on this work order",
      };
    }

    const etapa = parseOsStage(os.etapa_atual as string);
    if (!isBloqueioOperacionalEtapa(etapa)) {
      return {
        ok: false,
        message: "Current stage does not allow registering an operational block",
      };
    }

    if (!motivoBloqueioPermitido(etapa, categoria, motivo)) {
      return { ok: false, message: "Invalid reason for this stage" };
    }

    const { count: ativos, error: countErr } = await supabase
      .from("os_crashes")
      .select("id", { count: "exact", head: true })
      .eq("ordem_servico_id", ordem_servico_id)
      .eq("status", BLOQUEIO_STATUS_ATIVO);

    if (countErr) {
      return { ok: false, message: countErr.message };
    }

    if ((ativos ?? 0) > 0) {
      return {
        ok: false,
        message: "An active block already exists on this work order",
      };
    }

    const { data: inserted, error: insErr } = await supabase
      .from("os_crashes")
      .insert({
        ordem_servico_id,
        empresa_id: os.empresa_id,
        etapa,
        categoria,
        motivo,
        observacao,
        status: BLOQUEIO_STATUS_ATIVO,
        criado_por: userId,
      })
      .select("id")
      .single();

    if (insErr) {
      return { ok: false, message: insErr.message };
    }

    if (bloqueioMaterialInstalacaoRequerRetornoProjeto(etapa, categoria)) {
      const retorno = await retornarOsAoProjetoPorBloqueioMaterialInstalacao(
        supabase,
        ordem_servico_id,
        userId,
      );
      if (!retorno.ok) return retorno;
    }

    revalidateOs(ordem_servico_id);
    return { ok: true, id: inserted?.id as string };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error registering block",
    };
  }
}

export async function resolverBloqueioOperacional(
  ordemServicoId: string,
  bloqueioId: string,
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    if (!ordemServicoId?.trim() || !bloqueioId?.trim()) {
      return { ok: false, message: "Invalid block data" };
    }

    const { data: bloqueio, error: loadErr } = await supabase
      .from("os_crashes")
      .select("id, ordem_servico_id, status")
      .eq("id", bloqueioId)
      .eq("ordem_servico_id", ordemServicoId)
      .single();

    if (loadErr || !bloqueio) {
      return { ok: false, message: loadErr?.message ?? "Block not found" };
    }

    if (bloqueio.status !== BLOQUEIO_STATUS_ATIVO) {
      return { ok: false, message: "This block has already been resolved" };
    }

    const { error: updErr } = await supabase
      .from("os_crashes")
      .update({
        status: BLOQUEIO_STATUS_RESOLVIDO,
        resolvido_por: userId,
        resolvido_em: new Date().toISOString(),
      })
      .eq("id", bloqueioId)
      .eq("status", BLOQUEIO_STATUS_ATIVO);

    if (updErr) {
      return { ok: false, message: updErr.message };
    }

    revalidateOs(ordemServicoId);
    return { ok: true, id: bloqueioId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error resolving block",
    };
  }
}

export async function buscarBloqueioAtivoOs(
  ordemServicoId: string,
): Promise<{ bloqueio: OsCrash | null; error?: string }> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("os_crashes")
      .select("*")
      .eq("ordem_servico_id", ordemServicoId)
      .eq("status", BLOQUEIO_STATUS_ATIVO)
      .maybeSingle();

    if (error) return { bloqueio: null, error: error.message };
    return { bloqueio: (data as OsCrash | null) ?? null };
  } catch (e) {
    return {
      bloqueio: null,
      error: e instanceof Error ? e.message : "Error fetching block",
    };
  }
}
