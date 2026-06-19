"use server";

import { revalidatePath } from "next/cache";

import { validarSlotVisitaDisponivel } from "@/app/ordens-servico/agenda-disponibilidade";
import { verificarOsFluxoLiberado } from "@/app/ordens-servico/bloqueio-operacional-actions";
import { listarEquipesInstalacaoProjeto } from "@/app/ordens-servico/projeto-actions";
import { canAbrirRepair } from "@/lib/auth/can-abrir-repair";
import {
  spreadAgendaEventoDatetime,
  spreadAgendaEventoRange,
} from "@/lib/ordens-servico/agenda-evento-query";
import { buildAgendaIntervalIso } from "@/lib/ordens-servico/datetime";
import { isOsElegivelRepair, validarObservacaoValorRepair } from "@/lib/ordens-servico/os-repair";
import { parseValorEtapaInput } from "@/lib/ordens-servico/os-valores-etapa";
import {
  buildOperationalSnapshot,
  parseOsStage,
} from "@/lib/ordens-servico/operacional-snapshot";
import { validateEquipeIdForStage } from "@/lib/ordens-servico/workflow-equipe";
import { createClient } from "@/lib/supabase/server";
import type {
  Cliente,
  ClienteOsResumo,
  Equipe,
  OsAmbiente,
  OsRepairEpisode,
  Usuario,
} from "@/lib/types/database";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

export type ClienteRepairResumo = Pick<
  Cliente,
  "id" | "nome" | "telefone" | "email" | "endereco_formatado" | "cidade"
>;

function revalidateRepair(osId: string) {
  revalidatePath("/admin/centro-operacional");
  revalidatePath("/ordens-servico");
  revalidatePath("/operacao");
  revalidatePath("/calendar");
  revalidatePath("/clientes");
  revalidatePath("/os", "layout");
  revalidatePath(`/os/${osId}`);
}

async function requireRepairAuth(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  usuario: Usuario;
  equipe: Equipe | null;
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

  if (error || !usuario) throw new Error("User profile not found");

  let equipe: Equipe | null = null;
  if (usuario.equipe_id) {
    const { data } = await supabase
      .from("equipes")
      .select("id, nome, codigo_operacional, cor_primaria, cor_secundaria, ativo")
      .eq("id", usuario.equipe_id)
      .maybeSingle();
    equipe = (data as Equipe | null) ?? null;
  }

  if (!canAbrirRepair(usuario as Usuario, equipe)) {
    throw new Error("Only admin or commercial team can open a repair.");
  }

  return {
    supabase,
    userId: user.id,
    usuario: usuario as Usuario,
    equipe,
  };
}

export async function buscarClientesRepair(
  busca: string,
): Promise<{ clientes: ClienteRepairResumo[]; error?: string }> {
  try {
    await requireRepairAuth();
    const supabase = await createClient();
    const q = busca.trim().toLowerCase();
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome, telefone, email, endereco_formatado, cidade")
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .limit(200);

    if (error) return { clientes: [], error: error.message };

    const lista = (data ?? []) as ClienteRepairResumo[];
    if (!q) return { clientes: lista.slice(0, 40) };

    return {
      clientes: lista
        .filter((c) =>
          [c.nome, c.telefone, c.email, c.endereco_formatado, c.cidade]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        )
        .slice(0, 40),
    };
  } catch (e) {
    return {
      clientes: [],
      error: e instanceof Error ? e.message : "Error searching clients",
    };
  }
}

export async function listarOsRepairElegiveis(clienteId: string): Promise<{
  ordens: ClienteOsResumo[];
  error?: string;
}> {
  try {
    await requireRepairAuth();
    const supabase = await createClient();
    const cid = clienteId.trim();
    if (!cid) return { ordens: [], error: "Client required" };

    const { data: ordens, error: osErr } = await supabase
      .from("ordens_servico")
      .select(
        "id, cliente_id, titulo, status, atualizado_em, equipe_id, equipe_atual_id, etapa_atual, status_atual, repair_ativo",
      )
      .eq("cliente_id", cid)
      .eq("ativo", true)
      .eq("status", "completed")
      .eq("repair_ativo", false)
      .order("atualizado_em", { ascending: false });

    if (osErr) return { ordens: [], error: osErr.message };

    const lista = (ordens ?? []).filter(
      (o) => parseOsStage(o.etapa_atual as string) === "completed",
    );

    const equipeIds = [
      ...new Set(
        lista
          .flatMap((o) => [o.equipe_atual_id, o.equipe_id])
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const eqMap = new Map<string, Pick<Equipe, "id" | "nome" | "cor_primaria">>();
    if (equipeIds.length > 0) {
      const { data: equipes } = await supabase
        .from("equipes")
        .select("id, nome, cor_primaria")
        .in("id", equipeIds);
      for (const e of equipes ?? []) {
        eqMap.set(e.id, {
          id: e.id,
          nome: e.nome,
          cor_primaria: e.cor_primaria,
        });
      }
    }

    return {
      ordens: lista.map((o) => {
        const atualId = (o.equipe_atual_id ?? o.equipe_id) as string | null;
        const legacyId = o.equipe_id as string | null;
        return {
          id: o.id as string,
          cliente_id: o.cliente_id as string,
          titulo: o.titulo as string,
          status: o.status as ClienteOsResumo["status"],
          atualizado_em: o.atualizado_em as string,
          etapa_atual: (o.etapa_atual as string) ?? "completed",
          status_atual: (o.status_atual as string) ?? "completed",
          equipe_atual: atualId ? eqMap.get(atualId) ?? null : null,
          equipe: legacyId ? eqMap.get(legacyId) ?? null : null,
        };
      }),
    };
  } catch (e) {
    return {
      ordens: [],
      error: e instanceof Error ? e.message : "Error listing work orders",
    };
  }
}

export async function listarAmbientesRepair(osId: string): Promise<{
  ambientes: Pick<OsAmbiente, "id" | "nome">[];
  error?: string;
}> {
  try {
    await requireRepairAuth();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("os_ambientes")
      .select("id, nome")
      .eq("ordem_servico_id", osId.trim())
      .eq("ativo", true)
      .order("sort_order", { ascending: true });

    if (error) return { ambientes: [], error: error.message };
    return { ambientes: (data ?? []) as Pick<OsAmbiente, "id" | "nome">[] };
  } catch (e) {
    return {
      ambientes: [],
      error: e instanceof Error ? e.message : "Error listing environments",
    };
  }
}

export { listarEquipesInstalacaoProjeto as listarEquipesInstalacaoRepair };

async function prepararAmbientesParaRepair(
  supabase: Awaited<ReturnType<typeof createClient>>,
  osId: string,
  osAmbienteId: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: ambientes, error } = await supabase
    .from("os_ambientes")
    .select("id")
    .eq("ordem_servico_id", osId)
    .eq("ativo", true);

  if (error) return { ok: false, message: error.message };
  if (!ambientes?.length) return { ok: true };

  const targets =
    osAmbienteId != null
      ? ambientes.filter((a) => a.id === osAmbienteId)
      : ambientes;

  if (osAmbienteId && targets.length === 0) {
    return { ok: false, message: "Environment not found on this work order." };
  }

  for (const amb of targets) {
    const { error: updErr } = await supabase
      .from("os_ambientes")
      .update({
        instalacao_status: "pending",
        instalacao_bloqueio_categoria: null,
        instalacao_bloqueio_motivo: null,
        instalacao_bloqueio_observacao: null,
        instalacao_concluida_em: null,
      })
      .eq("id", amb.id);
    if (updErr) return { ok: false, message: updErr.message };
  }

  return { ok: true };
}

export async function abrirRepairOrdemServico(input: {
  osId: string;
  equipeId: string;
  dataInstalacao: string;
  horaInstalacao: string;
  horaFimInstalacao: string;
  valorSugerido?: string;
  osAmbienteId?: string | null;
}): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireRepairAuth();
    const osId = input.osId.trim();
    if (!osId) return { ok: false, message: "Work order required" };

    const bloqueioFluxo = await verificarOsFluxoLiberado(supabase, osId);
    if (bloqueioFluxo) return bloqueioFluxo;

    const { data: osRow, error: osErr } = await supabase
      .from("ordens_servico")
      .select("id, cliente_id, titulo, status, etapa_atual, repair_ativo, empresa_id")
      .eq("id", osId)
      .single();

    if (osErr || !osRow) {
      return { ok: false, message: osErr?.message ?? "Work order not found" };
    }

    if (!isOsElegivelRepair(osRow as Parameters<typeof isOsElegivelRepair>[0])) {
      return {
        ok: false,
        message: "Only fully completed work orders can open a repair.",
      };
    }

    let valorSugerido: number | null = null;
    if (input.valorSugerido?.trim()) {
      const parsed = parseValorEtapaInput(input.valorSugerido);
      if (!parsed.ok) return parsed;
      valorSugerido = parsed.value;
    }

    const equipe_id = input.equipeId.trim();
    if (!equipe_id) {
      return { ok: false, message: "Select the installation team" };
    }

    const eqOk = await validateEquipeIdForStage(supabase, equipe_id, "installation");
    if (!eqOk.ok) return { ok: false, message: eqOk.message };

    const intervalo = buildAgendaIntervalIso(
      input.dataInstalacao,
      input.horaInstalacao,
      input.horaFimInstalacao,
    );
    if (!intervalo) {
      return { ok: false, message: "Invalid installation date and time" };
    }

    const osAmbienteId = input.osAmbienteId?.trim() || null;

    const prep = await prepararAmbientesParaRepair(supabase, osId, osAmbienteId);
    if (!prep.ok) return prep;

    const slotOk = await validarSlotVisitaDisponivel(
      equipe_id,
      input.dataInstalacao,
      input.horaInstalacao,
      input.horaFimInstalacao,
      null,
    );
    if (!slotOk.ok) {
      if ("conflito" in slotOk && slotOk.conflito) {
        return {
          ok: false,
          message: "An installation is already scheduled for this team at this time.",
        };
      }
      return { ok: false, message: slotOk.message };
    }

    const { data: episode, error: epErr } = await supabase
      .from("os_repair_episodes")
      .insert({
        ordem_servico_id: osId,
        os_ambiente_id: osAmbienteId,
        empresa_id: osRow.empresa_id ?? null,
        valor_sugerido: valorSugerido,
        aberto_por: userId,
        status: "open",
      })
      .select("id")
      .single();

    if (epErr || !episode) {
      return { ok: false, message: epErr?.message ?? "Could not create repair episode" };
    }

    const titulo = `REPAIR — ${osRow.titulo ?? osId}`;
    const { data: agendaRow, error: agErr } = await supabase
      .from("agenda_eventos")
      .insert({
        ordem_servico_id: osId,
        cliente_id: osRow.cliente_id as string,
        equipe_id,
        responsavel_id: userId,
        tipo_evento: "installation",
        etapa: "installation",
        status: "scheduled",
        titulo,
        descricao: osAmbienteId ? `repair_ambiente:${osAmbienteId}` : "repair_all",
        is_repair: true,
        ...spreadAgendaEventoRange(intervalo.isoInicio, intervalo.isoFim),
      })
      .select("id")
      .single();

    if (agErr || !agendaRow) {
      await supabase.from("os_repair_episodes").delete().eq("id", episode.id);
      return { ok: false, message: agErr?.message ?? "Could not schedule repair" };
    }

    await supabase
      .from("os_repair_episodes")
      .update({ agenda_evento_id: agendaRow.id })
      .eq("id", episode.id);

    const snapshot = buildOperationalSnapshot(equipe_id, "installation", "scheduled");

    const { error: osUpdErr } = await supabase
      .from("ordens_servico")
      .update({
        repair_ativo: true,
        repair_episode_id: episode.id,
        etapa_atual: snapshot.etapa_atual,
        status_atual: snapshot.status_atual,
        equipe_atual_id: snapshot.equipe_atual_id,
        equipe_id: equipe_id,
        status: "scheduled",
      })
      .eq("id", osId);

    if (osUpdErr) return { ok: false, message: osUpdErr.message };

    const { error: auditErr } = await supabase.from("agenda_eventos").insert({
      ordem_servico_id: osId,
      cliente_id: osRow.cliente_id as string,
      equipe_id,
      responsavel_id: userId,
      tipo_evento: "repair_opened",
      etapa: "installation",
      status: "completed",
      titulo: "repair_opened",
      descricao: valorSugerido != null ? String(valorSugerido) : null,
      is_repair: true,
      ...spreadAgendaEventoDatetime(new Date().toISOString()),
    });

    if (auditErr) return { ok: false, message: auditErr.message };

    revalidateRepair(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error opening repair",
    };
  }
}

export async function salvarValorRepairInstalacao(
  osId: string,
  valorRaw: string,
  observacaoRaw: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuthBasic();
    const loaded = await loadRepairEpisodeAtivo(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const parsed = parseValorEtapaInput(valorRaw);
    if (!parsed.ok) return parsed;

    const obs = observacaoRaw.trim() || null;

    const errObs = validarObservacaoValorRepair({
      valor_sugerido: loaded.episode.valor_sugerido,
      valor_final: parsed.value,
      valor_alteracao_observacao: obs,
    });
    if (errObs) return { ok: false, message: errObs };

    const { error } = await supabase
      .from("os_repair_episodes")
      .update({
        valor_final: parsed.value,
        valor_alteracao_observacao: obs,
      })
      .eq("id", loaded.episode.id);

    if (error) return { ok: false, message: error.message };
    revalidateRepair(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error saving repair amount",
    };
  }
}

async function requireAuthBasic() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired");
  return { supabase, userId: user.id };
}

async function loadRepairEpisodeAtivo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  osId: string,
): Promise<{ error: string } | { episode: OsRepairEpisode }> {
  const { data: os, error: osErr } = await supabase
    .from("ordens_servico")
    .select("repair_ativo, repair_episode_id")
    .eq("id", osId)
    .single();

  if (osErr || !os) return { error: osErr?.message ?? "Work order not found" };
  if (!os.repair_ativo || !os.repair_episode_id) {
    return { error: "No active repair on this work order." };
  }

  const { data: episode, error } = await supabase
    .from("os_repair_episodes")
    .select("*")
    .eq("id", os.repair_episode_id)
    .single();

  if (error || !episode) return { error: error?.message ?? "Repair episode not found" };
  return { episode: episode as OsRepairEpisode };
}

export async function validarRepairProntoParaFinalizar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  osId: string,
): Promise<ActionResult> {
  const loaded = await loadRepairEpisodeAtivo(supabase, osId);
  if ("error" in loaded) return { ok: false, message: loaded.error };
  const errObs = validarObservacaoValorRepair(loaded.episode);
  if (errObs) return { ok: false, message: errObs };
  return { ok: true, id: osId };
}

export async function concluirRepairEpisode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  osId: string,
  userId: string,
): Promise<ActionResult> {
  const loaded = await loadRepairEpisodeAtivo(supabase, osId);
  if ("error" in loaded) return { ok: false, message: loaded.error };

  const errObs = validarObservacaoValorRepair(loaded.episode);
  if (errObs) return { ok: false, message: errObs };

  const valorFinal =
    loaded.episode.valor_final ?? loaded.episode.valor_sugerido ?? null;

  const { error: epErr } = await supabase
    .from("os_repair_episodes")
    .update({
      status: "completed",
      concluido_em: new Date().toISOString(),
      valor_final: valorFinal,
    })
    .eq("id", loaded.episode.id);

  if (epErr) return { ok: false, message: epErr.message };

  const { data: osRow } = await supabase
    .from("ordens_servico")
    .select("cliente_id, equipe_id")
    .eq("id", osId)
    .single();

  const { error: auditErr } = await supabase.from("agenda_eventos").insert({
    ordem_servico_id: osId,
    cliente_id: osRow?.cliente_id,
    equipe_id: osRow?.equipe_id,
    responsavel_id: userId,
    tipo_evento: "repair_completed",
    etapa: "installation",
    status: "completed",
    titulo: "repair_completed",
    descricao: valorFinal != null ? String(valorFinal) : null,
    is_repair: true,
    ...spreadAgendaEventoDatetime(new Date().toISOString()),
  });

  if (auditErr) return { ok: false, message: auditErr.message };

  const { error: osErr } = await supabase
    .from("ordens_servico")
    .update({
      repair_ativo: false,
      repair_episode_id: null,
    })
    .eq("id", osId);

  if (osErr) return { ok: false, message: osErr.message };
  return { ok: true, id: osId };
}
