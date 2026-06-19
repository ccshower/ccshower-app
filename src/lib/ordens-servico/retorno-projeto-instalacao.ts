import { spreadAgendaEventoDatetime } from "@/lib/ordens-servico/agenda-evento-query";
import {
  buildOperationalSnapshot,
  parseOsStage,
} from "@/lib/ordens-servico/operacional-snapshot";
import {
  ambientesInstalacaoBloqueados,
  parseOsAmbienteInstalacaoStatus,
} from "@/lib/ordens-servico/os-ambiente-instalacao";
import { orderStatusOnEnterStage } from "@/lib/ordens-servico/workflow";
import { resolveDefaultTeamForStage } from "@/lib/ordens-servico/workflow-equipe";
import type { OsAmbiente } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RetornoProjetoInstalacaoResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

/** Devolve OS da Instalação ao Projeto (bloqueio parcial por ambiente). */
export async function retornarOsInstalacaoAoProjeto(
  supabase: SupabaseClient,
  osId: string,
  userId: string,
  ambientes: OsAmbiente[],
  motivoEvento?: string,
): Promise<RetornoProjetoInstalacaoResult> {
  const blocked = ambientesInstalacaoBloqueados(ambientes);
  const blockedNames = blocked.map((a) => a.nome?.trim() || "Environment").join(", ");
  const descricao =
    motivoEvento?.trim() ||
    `Partial installation — blocked environments: ${blockedNames}. Work order returned to Project.`;

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
    equipe_id: equipeFallback ?? equipeId,
    responsavel_id: userId,
    tipo_evento: "stage_changed",
    etapa: "project",
    status: "completed",
    titulo: "stage_changed",
    descricao,
    ...spreadAgendaEventoDatetime(when),
  });

  if (evErr) return { ok: false, message: evErr.message };

  return { ok: true, id: osId };
}

/** Ao reenviar ao Projeto → Instalação: ambientes bloqueados voltam a pending para nova tentativa. */
export async function prepararAmbientesBloqueadosParaNovaInstalacao(
  supabase: SupabaseClient,
  osId: string,
  ambientes: OsAmbiente[],
): Promise<{ error: string | null }> {
  const blockedIds = ambientes
    .filter((a) => parseOsAmbienteInstalacaoStatus(a.instalacao_status) === "blocked")
    .map((a) => a.id);

  if (blockedIds.length === 0) return { error: null };

  const { error } = await supabase
    .from("os_ambientes")
    .update({
      instalacao_status: "pending",
      instalacao_bloqueio_categoria: null,
      instalacao_bloqueio_motivo: null,
      instalacao_bloqueio_observacao: null,
      instalacao_concluida_em: null,
    })
    .eq("ordem_servico_id", osId)
    .in("id", blockedIds);

  return { error: error?.message ?? null };
}
