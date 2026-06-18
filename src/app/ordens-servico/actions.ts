"use server";

import { revalidatePath } from "next/cache";

import { buildAgendaIntervalIso } from "@/lib/ordens-servico/datetime";
import {
  OS_STATUS,
  parseOrdemServicoStatus,
  type OrdemServicoStatus,
} from "@/lib/ordens-servico/constants";
import { formatStatusTransition, tOsStage } from "@/lib/i18n";
import { validarIntervaloAgenda } from "@/lib/ordens-servico/visita-slots";
import { validarSlotVisitaDisponivel } from "@/app/ordens-servico/agenda-disponibilidade";
import { verificarOsFluxoLiberado } from "@/app/ordens-servico/bloqueio-operacional-actions";
import {
  AGENDA_EVENTO_COLUMNS,
  AGENDA_EVENTO_DATETIME_COLUMNS,
  compareAgendaEventoStartAsc,
  spreadAgendaEventoDatetime,
  spreadAgendaEventoRange,
} from "@/lib/ordens-servico/agenda-evento-query";
import { parsePossuiInstalacaoFromForm } from "@/lib/clientes/tipo-cliente";
import {
  buildOperationalSnapshot,
  parseOsStage,
} from "@/lib/ordens-servico/operacional-snapshot";
import {
  normalizePersistedStage,
  resolveDefaultTeamForStage,
  validateEquipeIdForStage,
} from "@/lib/ordens-servico/workflow-equipe";
import {
  auditStageChangeDescription,
  listTransitionOptions,
  orderStatusOnEnterStage,
  parseOsWorkflowStage,
  prepareStageTransitionNotifications,
  stageIsTerminal,
  transitionAllowed,
  type OsWorkflowStage,
} from "@/lib/ordens-servico/workflow";
import { parseResponsavelIdFromForm } from "@/lib/ordens-servico/responsavel-equipe";
import { createClient } from "@/lib/supabase/server";
import { loadOrdemServicoDetalhe } from "@/lib/ordens-servico/load-ordem-servico-detalhe";
import { resolveEmpresaId } from "@/lib/ordens-servico/resolve-empresa-id";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

type ActiveUsuario = {
  id: string;
  equipe_id: string | null;
  ativo: boolean;
  tipo_usuario: string;
  pode_ver_todas_equipes: boolean;
};

async function requireActiveSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Session expired");

  const { data: row, error } = await supabase
    .from("usuarios")
    .select("id, equipe_id, ativo, tipo_usuario, pode_ver_todas_equipes")
    .eq("id", user.id)
    .single();

  if (error || !row?.ativo) throw new Error("No permission");

  return { supabase, usuario: row as ActiveUsuario, userId: user.id };
}

function emptyToNull(v: FormDataEntryValue | null) {
  const trimmed = String(v ?? "").trim();
  return trimmed.length ? trimmed : null;
}

type HorariosVisitaParsed =
  | {
      ok: true;
      data_visita: string;
      hora_visita: string;
      hora_fim_visita: string;
      isoInicio: string;
      isoFim: string;
    }
  | { ok: false; message: string };

function parseHorariosVisitaForm(formData: FormData): HorariosVisitaParsed {
  const data_visita = String(formData.get("data_visita") ?? "");
  const hora_visita = String(formData.get("hora_visita") ?? "");
  const hora_fim_visita = String(formData.get("hora_fim_visita") ?? "");
  const intervalo = validarIntervaloAgenda(hora_visita, hora_fim_visita);
  if (!intervalo.ok) {
    return { ok: false, message: intervalo.message };
  }
  const built = buildAgendaIntervalIso(
    data_visita,
    intervalo.inicio,
    intervalo.fim,
  );
  if (!built) {
    return { ok: false, message: "Invalid visit date and time" };
  }
  return {
    ok: true,
    data_visita,
    hora_visita: intervalo.inicio,
    hora_fim_visita: intervalo.fim,
    isoInicio: built.isoInicio,
    isoFim: built.isoFim,
  };
}

function canChooseEquipe(usuario: ActiveUsuario) {
  return usuario.tipo_usuario === "admin" || usuario.pode_ver_todas_equipes;
}

function getEquipeId(formData: FormData, usuario: ActiveUsuario) {
  const requested = emptyToNull(formData.get("equipe_id"));
  if (canChooseEquipe(usuario)) return requested;
  return usuario.equipe_id;
}

function parseStatus(raw: string): OrdemServicoStatus | null {
  return parseOrdemServicoStatus(raw);
}

function revalidateOsPaths(osId?: string) {
  revalidatePath("/ordens-servico");
  revalidatePath("/clientes");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/centro-operacional");
  revalidatePath("/operacao");
  revalidatePath("/calendar");
  revalidatePath("/os", "layout");
  if (osId) revalidatePath(`/os/${osId}`);
}

function isAdminUsuario(usuario: ActiveUsuario) {
  return usuario.tipo_usuario === "admin";
}

async function registrarEventoAgenda(
  supabase: Awaited<ReturnType<typeof requireActiveSupabase>>["supabase"],
  params: {
    ordem_servico_id: string;
    cliente_id: string;
    equipe_id: string;
    responsavel_id: string | null;
    tipo_evento: string;
    etapa: string;
    status: string;
    titulo: string;
    descricao: string | null;
    data_evento?: string;
  },
): Promise<ActionResult | null> {
  const when = params.data_evento ?? new Date().toISOString();
  const { error } = await supabase.from("agenda_eventos").insert({
    ordem_servico_id: params.ordem_servico_id,
    cliente_id: params.cliente_id,
    equipe_id: params.equipe_id,
    responsavel_id: params.responsavel_id,
    tipo_evento: params.tipo_evento,
    etapa: params.etapa,
    status: params.status,
    titulo: params.titulo,
    descricao: params.descricao,
    ...spreadAgendaEventoDatetime(when),
  });

  if (error) return { ok: false, message: error.message };
  return null;
}

async function registrarStageChangeAgenda(
  supabase: Awaited<ReturnType<typeof requireActiveSupabase>>["supabase"],
  params: {
    ordem_servico_id: string;
    cliente_id: string;
    equipe_id: string;
    responsavel_id: string | null;
    stage_new: OsWorkflowStage;
    descricao: string;
    force: boolean;
  },
): Promise<ActionResult | null> {
  return registrarEventoAgenda(supabase, {
    ordem_servico_id: params.ordem_servico_id,
    cliente_id: params.cliente_id,
    equipe_id: params.equipe_id,
    responsavel_id: params.responsavel_id,
    tipo_evento: "stage_changed",
    etapa: params.stage_new,
    status: "completed",
    titulo: "stage_changed",
    descricao: params.descricao,
  });
}

async function aplicarTransicaoEtapa(
  id: string,
  novaEtapaRaw: string,
  opts: { forcar: boolean; motivo?: string | null },
): Promise<ActionResult> {
  const novaEtapa = parseOsWorkflowStage(novaEtapaRaw);
  if (!novaEtapa) {
    return { ok: false, message: "Invalid target stage" };
  }

  const { supabase, usuario, userId } = await requireActiveSupabase();

  const { data: os, error: loadErr } = await supabase
    .from("ordens_servico")
    .select(
      "id, cliente_id, status, etapa_atual, equipe_atual_id, equipe_id, responsavel_id",
    )
    .eq("id", id)
    .single();

  if (loadErr || !os) {
    return { ok: false, message: loadErr?.message ?? "Work order not found" };
  }

  const bloqueioFluxo = await verificarOsFluxoLiberado(supabase, id);
  if (bloqueioFluxo) return bloqueioFluxo;

  const etapaAtual = normalizePersistedStage(os.etapa_atual as string);

  if (stageIsTerminal(etapaAtual) && !opts.forcar) {
    return { ok: false, message: "Work order already completed — cannot advance" };
  }

  if (!opts.forcar) {
    if (!transitionAllowed(etapaAtual, novaEtapa)) {
      return {
        ok: false,
        message: `Invalid transition: ${etapaAtual} cannot go to ${novaEtapa}`,
      };
    }
  } else if (!isAdminUsuario(usuario)) {
    return { ok: false, message: "Only admin can force a stage change" };
  }

  const equipeFallback =
    (os.equipe_atual_id as string | null) ?? (os.equipe_id as string | null);

  const equipeExecutora =
    (os.equipe_atual_id as string | null) ?? (os.equipe_id as string | null);

  const { equipeId, error: eqErr } = await resolveDefaultTeamForStage(
    supabase,
    novaEtapa,
    equipeFallback,
  );

  if (eqErr || !equipeId) {
    return { ok: false, message: eqErr ?? "Stage team not configured" };
  }

  const statusOrdem = orderStatusOnEnterStage(novaEtapa);
  const snapshot = buildOperationalSnapshot(equipeId, novaEtapa, statusOrdem);

  const etapaUpdate: Record<string, unknown> = {
    etapa_atual: snapshot.etapa_atual,
    status_atual: snapshot.status_atual,
    equipe_atual_id: snapshot.equipe_atual_id,
    equipe_id: equipeId,
    status: statusOrdem,
  };

  if (novaEtapa === "financial_review") {
    etapaUpdate.financial_decision = "pending";
    etapaUpdate.financial_rejection_reason = null;
  }

  const { error: updErr } = await supabase
    .from("ordens_servico")
    .update(etapaUpdate)
    .eq("id", id);

  if (updErr) return { ok: false, message: updErr.message };

  const ctx = {
    ordemServicoId: id,
    clienteId: os.cliente_id as string,
    stagePrevious: etapaAtual,
    stageNew: novaEtapa,
    usuarioId: userId,
    equipeId,
    force: opts.forcar,
    motivo: opts.motivo,
  };

  prepareStageTransitionNotifications(ctx);

  const auditErr = await registrarStageChangeAgenda(supabase, {
    ordem_servico_id: id,
    cliente_id: os.cliente_id as string,
    equipe_id: equipeExecutora ?? equipeId,
    responsavel_id: userId,
    stage_new: novaEtapa,
    descricao: auditStageChangeDescription(ctx),
    force: opts.forcar,
  });

  if (auditErr) return auditErr;

  revalidateOsPaths();
  return { ok: true, id };
}

/** Cria OS + primeira visita tecnica (fluxo oficial). */
export async function criarOrdemServicoComVisita(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, usuario, userId } = await requireActiveSupabase();

    const cliente_id = String(formData.get("cliente_id") ?? "");
    const tituloRaw = String(formData.get("titulo") ?? "").trim();
    const descricao = emptyToNull(formData.get("descricao"));
    const observacoes = emptyToNull(formData.get("observacoes"));
    const horarios = parseHorariosVisitaForm(formData);
    if (!horarios.ok) return { ok: false, message: horarios.message };
    const equipe_id = getEquipeId(formData, usuario);
    const possui_instalacao = parsePossuiInstalacaoFromForm(
      formData.get("possui_instalacao"),
    );

    if (!cliente_id) {
      return { ok: false, message: "Client is required" };
    }
    if (!equipe_id) {
      return { ok: false, message: "Select the work order team" };
    }

    const eqOk = await validateEquipeIdForStage(supabase, equipe_id, "commercial");
    if (!eqOk.ok) return { ok: false, message: eqOk.message };

    const slotOk = await validarSlotVisitaDisponivel(
      equipe_id,
      horarios.data_visita,
      horarios.hora_visita,
      horarios.hora_fim_visita,
    );
    if (!slotOk.ok) return slotOk;

    const snapshot = buildOperationalSnapshot(
      equipe_id,
      "commercial",
      "scheduled",
    );

    const { data: cli, error: cliErr } = await supabase
      .from("clientes")
      .select(
        "id, endereco_formatado, latitude, longitude, equipe_id, ativo",
      )
      .eq("id", cliente_id)
      .single();

    if (cliErr || !cli) {
      return { ok: false, message: cliErr?.message ?? "Client not found" };
    }

    const titulo = tituloRaw || `Visit — ${cliente_id}`;

    const empresa_id = await resolveEmpresaId(supabase, {
      clienteId: cliente_id,
      userId,
    });
    if (!empresa_id) {
      return {
        ok: false,
        message:
          "Could not determine company_id for the work order (client or user)",
      };
    }

    const { data: os, error: osErr } = await supabase
      .from("ordens_servico")
      .insert({
        empresa_id,
        cliente_id,
        titulo,
        descricao,
        observacoes,
        status: "scheduled",
        equipe_id: equipe_id ?? cli.equipe_id,
        responsavel_id: null,
        possui_instalacao,
        equipe_atual_id: snapshot.equipe_atual_id,
        etapa_atual: snapshot.etapa_atual,
        status_atual: snapshot.status_atual,
        criado_por: userId,
        ativo: true,
      })
      .select("id")
      .single();

    if (osErr || !os) {
      return { ok: false, message: osErr?.message ?? "Error creating work order" };
    }

    const criadaErr = await registrarEventoAgenda(supabase, {
      ordem_servico_id: os.id,
      cliente_id,
      equipe_id: equipe_id ?? cli.equipe_id,
      responsavel_id: userId,
      tipo_evento: "os_created",
      etapa: "commercial",
      status: "completed",
      titulo: "os_created",
      descricao: titulo,
    });
    if (criadaErr) {
      await supabase.from("ordens_servico").delete().eq("id", os.id);
      return criadaErr;
    }

    const { error: evErr } = await supabase.from("agenda_eventos").insert({
      ordem_servico_id: os.id,
      cliente_id,
      equipe_id: equipe_id ?? cli.equipe_id,
      responsavel_id: null,
      tipo_evento: "technical_visit",
      etapa: "commercial",
      status: "scheduled",
      titulo,
      descricao: observacoes ?? descricao,
      ...spreadAgendaEventoRange(horarios.isoInicio, horarios.isoFim),
    });

    if (evErr) {
      await supabase.from("ordens_servico").delete().eq("id", os.id);
      return { ok: false, message: evErr.message };
    }

    revalidateOsPaths();
    return { ok: true, id: os.id };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error creating work order and visit",
    };
  }
}

/** Agenda a primeira visita técnica de uma OS existente (status SEM VISITA). */
export async function agendarVisitaExistente(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, usuario, userId } = await requireActiveSupabase();

    const os_id = String(formData.get("os_id") ?? "").trim();
    const cliente_id = String(formData.get("cliente_id") ?? "").trim();
    const tituloRaw = String(formData.get("titulo") ?? "").trim();
    const descricao = emptyToNull(formData.get("descricao"));
    const horarios = parseHorariosVisitaForm(formData);
    if (!horarios.ok) return { ok: false, message: horarios.message };
    const equipe_id = getEquipeId(formData, usuario);
    const possui_instalacao = parsePossuiInstalacaoFromForm(
      formData.get("possui_instalacao"),
    );

    if (!os_id || !cliente_id) {
      return { ok: false, message: "Work order and client are required" };
    }
    if (!equipe_id) {
      return { ok: false, message: "Select the visit team" };
    }

    const { data: os, error: loadErr } = await supabase
      .from("ordens_servico")
      .select(
        "id, cliente_id, status, status_atual, etapa_atual, equipe_id, equipe_atual_id",
      )
      .eq("id", os_id)
      .single();

    if (loadErr || !os) {
      return { ok: false, message: loadErr?.message ?? "Work order not found" };
    }

    const bloqueioFluxo = await verificarOsFluxoLiberado(supabase, os_id);
    if (bloqueioFluxo) return bloqueioFluxo;

    if (os.cliente_id !== cliente_id) {
      return { ok: false, message: "Client does not match the work order" };
    }

    if (parseOsStage(os.etapa_atual as string) !== "commercial") {
      return {
        ok: false,
        message: "Scheduling available only in the commercial stage",
      };
    }

    const etapaAtual = parseOsStage(os.etapa_atual as string);
    const eqOk = await validateEquipeIdForStage(supabase, equipe_id, etapaAtual);
    if (!eqOk.ok) return { ok: false, message: eqOk.message };

    const statusAtual = String(os.status_atual ?? "");
    if (statusAtual !== "no_visit" && os.status !== "open") {
      return {
        ok: false,
        message: "This work order already has a scheduled or in-progress visit",
      };
    }

    const { count: visitasExistentes } = await supabase
      .from("agenda_eventos")
      .select("id", { count: "exact", head: true })
      .eq("ordem_servico_id", os_id)
      .eq("tipo_evento", "technical_visit");

    if ((visitasExistentes ?? 0) > 0) {
      return {
        ok: false,
        message: "This work order already has a technical visit on record",
      };
    }

    const slotOk = await validarSlotVisitaDisponivel(
      equipe_id,
      horarios.data_visita,
      horarios.hora_visita,
      horarios.hora_fim_visita,
    );
    if (!slotOk.ok) return slotOk;

    const snapshot = buildOperationalSnapshot(
      equipe_id,
      "commercial",
      "scheduled",
    );

    const titulo = tituloRaw || `Visit — ${cliente_id}`;

    const { error: osUpdErr } = await supabase
      .from("ordens_servico")
      .update({
        titulo,
        descricao,
        status: "scheduled",
        possui_instalacao,
        equipe_id,
        equipe_atual_id: snapshot.equipe_atual_id,
        etapa_atual: snapshot.etapa_atual,
        status_atual: snapshot.status_atual,
      })
      .eq("id", os_id);

    if (osUpdErr) {
      return { ok: false, message: osUpdErr.message };
    }

    const { error: evErr } = await supabase.from("agenda_eventos").insert({
      ordem_servico_id: os_id,
      cliente_id,
      equipe_id,
      responsavel_id: userId,
      tipo_evento: "technical_visit",
      etapa: "commercial",
      status: "scheduled",
      titulo,
      descricao,
      ...spreadAgendaEventoRange(horarios.isoInicio, horarios.isoFim),
    });

    if (evErr) {
      await supabase
        .from("ordens_servico")
        .update({
          status: "open",
          status_atual: "no_visit",
          etapa_atual: "commercial",
          equipe_atual_id: (os.equipe_atual_id ?? os.equipe_id) as string,
        })
        .eq("id", os_id);
      return { ok: false, message: evErr.message };
    }

    const auditErr = await registrarEventoAgenda(supabase, {
      ordem_servico_id: os_id,
      cliente_id,
      equipe_id,
      responsavel_id: userId,
      tipo_evento: "status_changed",
      etapa: "commercial",
      status: "completed",
      titulo: "status_changed",
      descricao: formatStatusTransition("open", "scheduled"),
    });
    if (auditErr) return auditErr;

    revalidateOsPaths(os_id);
    return { ok: true, id: os_id };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error scheduling visit",
    };
  }
}

export async function buscarDetalheOrdemServico(
  id: string,
): Promise<{ data: OrdemServicoWithRelations | null; error?: string }> {
  try {
    await requireActiveSupabase();
    return loadOrdemServicoDetalhe(id);
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Error loading work order",
    };
  }
}

export async function alterarStatusOrdemServico(
  id: string,
  status: OrdemServicoStatus,
): Promise<ActionResult> {
  try {
    if (!parseStatus(status)) {
      return { ok: false, message: "Invalid status" };
    }

    const { supabase, userId } = await requireActiveSupabase();

    const { data: os, error: loadErr } = await supabase
      .from("ordens_servico")
      .select(
        "cliente_id, status, equipe_atual_id, equipe_id, etapa_atual, responsavel_id",
      )
      .eq("id", id)
      .single();

    if (loadErr || !os) {
      return { ok: false, message: loadErr?.message ?? "Work order not found" };
    }

    const statusAnterior = parseStatus(os.status as string);
    if (statusAnterior === status) {
      revalidateOsPaths();
      return { ok: true, id };
    }

    const equipeId = (os.equipe_atual_id ?? os.equipe_id) as string | null;
    if (!equipeId) {
      return { ok: false, message: "Work order has no team for operational snapshot" };
    }

    const etapaAtual = parseOsStage(os.etapa_atual as string);
    const snapshot = buildOperationalSnapshot(equipeId, etapaAtual, status);

    const { error } = await supabase
      .from("ordens_servico")
      .update({
        status,
        equipe_atual_id: snapshot.equipe_atual_id,
        etapa_atual: snapshot.etapa_atual,
        status_atual: snapshot.status_atual,
      })
      .eq("id", id);

    if (error) return { ok: false, message: error.message };

    if (statusAnterior) {
      const auditErr = await registrarEventoAgenda(supabase, {
        ordem_servico_id: id,
        cliente_id: os.cliente_id as string,
        equipe_id: equipeId,
        responsavel_id: userId,
        tipo_evento: "status_changed",
        etapa: etapaAtual,
        status: "completed",
        titulo: "status_changed",
        descricao: formatStatusTransition(statusAnterior, status),
      });
      if (auditErr) return auditErr;
    }

    revalidateOsPaths();
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error changing status",
    };
  }
}

/** Transição validada no pipeline (usuário comum). */
export async function transicionarEtapaOrdemServico(
  id: string,
  novaEtapa: string,
): Promise<ActionResult> {
  try {
    return await aplicarTransicaoEtapa(id, novaEtapa, { forcar: false });
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error advancing stage",
    };
  }
}

/** Admin: força etapa (ação explícita). */
export async function forcarEtapaOrdemServico(
  id: string,
  novaEtapa: string,
  motivo?: string | null,
): Promise<ActionResult> {
  try {
    return await aplicarTransicaoEtapa(id, novaEtapa, {
      forcar: true,
      motivo,
    });
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error forcing stage",
    };
  }
}

/** @deprecated Use transicionarEtapaOrdemServico */
export async function avancarEtapaOrdemServico(
  id: string,
  novaEtapa: string,
): Promise<ActionResult> {
  return transicionarEtapaOrdemServico(id, novaEtapa);
}

export type WorkflowOrdemServicoInfo = {
  etapaAtual: OsWorkflowStage;
  terminal: boolean;
  proximas: { etapa: OsWorkflowStage; label: string }[];
  podeForcar: boolean;
};

export async function obterWorkflowOrdemServico(
  id: string,
): Promise<{ data: WorkflowOrdemServicoInfo | null; error?: string }> {
  try {
    const { supabase, usuario } = await requireActiveSupabase();

    const { data: os, error } = await supabase
      .from("ordens_servico")
      .select("etapa_atual")
      .eq("id", id)
      .single();

    if (error || !os) {
      return { data: null, error: error?.message ?? "Work order not found" };
    }

    const etapaAtual = normalizePersistedStage(os.etapa_atual as string);
    const opcoes = listTransitionOptions(etapaAtual);

    return {
      data: {
        etapaAtual,
        terminal: stageIsTerminal(etapaAtual),
        proximas: opcoes.map((o) => ({
          etapa: o.to,
          label: tOsStage(o.to),
        })),
        podeForcar: isAdminUsuario(usuario),
      },
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : "Error loading workflow",
    };
  }
}

export async function atualizarOrdemServicoObservacoes(
  id: string,
  observacoes: string | null,
  status: OrdemServicoStatus,
): Promise<ActionResult> {
  try {
    if (!parseStatus(status)) {
      return { ok: false, message: "Invalid status" };
    }

    const { supabase } = await requireActiveSupabase();
    const { error } = await supabase
      .from("ordens_servico")
      .update({ observacoes, status })
      .eq("id", id);

    if (error) return { ok: false, message: error.message };

    revalidateOsPaths();
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error updating work order",
    };
  }
}

async function validarResponsavelEquipe(
  supabase: Awaited<ReturnType<typeof requireActiveSupabase>>["supabase"],
  equipe_id: string,
  responsavel_id: string | null,
): Promise<ActionResult | null> {
  if (!responsavel_id) return null;

  const { data: membro, error: membroErr } = await supabase
    .from("usuarios")
    .select("id, equipe_id, ativo")
    .eq("id", responsavel_id)
    .maybeSingle();

  if (membroErr || !membro?.ativo || membro.equipe_id !== equipe_id) {
    return {
      ok: false,
      message: "Assignee must belong to the selected team",
    };
  }

  return null;
}

/** Atualiza OS existente + visita técnica principal (dados operacionais). */
export async function atualizarOrdemServicoOperacional(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, usuario, userId } = await requireActiveSupabase();

    const id = String(formData.get("id") ?? "").trim();
    const titulo = String(formData.get("titulo") ?? "").trim();
    const descricao = emptyToNull(formData.get("descricao"));
    const observacoes = emptyToNull(formData.get("observacoes"));
    const statusRaw = String(formData.get("status") ?? "");
    const status = parseStatus(statusRaw);
    const horarios = parseHorariosVisitaForm(formData);
    if (!horarios.ok) return { ok: false, message: horarios.message };
    const equipe_id = getEquipeId(formData, usuario);
    const responsavel_id = parseResponsavelIdFromForm(
      formData.get("responsavel_id"),
    );
    const possui_instalacao = parsePossuiInstalacaoFromForm(
      formData.get("possui_instalacao"),
    );
    const visita_id = emptyToNull(formData.get("visita_id"));

    if (!id || !titulo) {
      return { ok: false, message: "Work order and title are required" };
    }
    if (!status) {
      return { ok: false, message: "Invalid status" };
    }
    if (!equipe_id) {
      return { ok: false, message: "Select the work order team" };
    }

    const respErr = await validarResponsavelEquipe(
      supabase,
      equipe_id,
      responsavel_id,
    );
    if (respErr) return respErr;

    const slotOk = await validarSlotVisitaDisponivel(
      equipe_id,
      horarios.data_visita,
      horarios.hora_visita,
      horarios.hora_fim_visita,
      visita_id,
    );
    if (!slotOk.ok) return slotOk;

    const { data: osAtual, error: loadErr } = await supabase
      .from("ordens_servico")
      .select(
        "id, cliente_id, status, etapa_atual, equipe_atual_id, equipe_id, responsavel_id",
      )
      .eq("id", id)
      .single();

    if (loadErr || !osAtual) {
      return { ok: false, message: loadErr?.message ?? "Work order not found" };
    }

    const statusAnterior = parseStatus(osAtual.status as string);
    const etapa_atual = parseOsStage(osAtual.etapa_atual as string);
    const equipeOperacionalFallback =
      (osAtual.equipe_atual_id as string | null) ??
      (osAtual.equipe_id as string | null) ??
      equipe_id;

    const { equipeId: equipeAtualId, error: eqSnapErr } =
      await resolveDefaultTeamForStage(
        supabase,
        etapa_atual,
        equipeOperacionalFallback,
      );

    if (eqSnapErr || !equipeAtualId) {
      return { ok: false, message: eqSnapErr ?? "Operational team unavailable" };
    }

    const snapshot = buildOperationalSnapshot(
      equipeAtualId,
      etapa_atual,
      status,
    );

    const { error: osErr } = await supabase
      .from("ordens_servico")
      .update({
        titulo,
        descricao,
        observacoes,
        status,
        equipe_id,
        responsavel_id,
        possui_instalacao,
        equipe_atual_id: snapshot.equipe_atual_id,
        etapa_atual: snapshot.etapa_atual,
        status_atual: snapshot.status_atual,
      })
      .eq("id", id);

    if (osErr) return { ok: false, message: osErr.message };

    if (statusAnterior && statusAnterior !== status) {
      const auditErr = await registrarEventoAgenda(supabase, {
        ordem_servico_id: id,
        cliente_id: osAtual.cliente_id as string,
        equipe_id: equipeAtualId,
        responsavel_id: userId,
        tipo_evento: "status_changed",
        etapa: etapa_atual,
        status: "completed",
        titulo: "status_changed",
        descricao: formatStatusTransition(statusAnterior, status),
      });
      if (auditErr) return auditErr;
    }

    let eventoId = visita_id;
    if (!eventoId) {
      const { data: evs } = await supabase
        .from("agenda_eventos")
        .select(AGENDA_EVENTO_DATETIME_COLUMNS)
        .eq("ordem_servico_id", id)
        .eq("tipo_evento", "technical_visit");

      const sorted = [...(evs ?? [])].sort(compareAgendaEventoStartAsc);
      eventoId = sorted[0]?.id ?? null;
    }

    if (eventoId) {
      const { error: evErr } = await supabase
        .from("agenda_eventos")
        .update({
          titulo,
          descricao: observacoes ?? descricao,
          ...spreadAgendaEventoRange(horarios.isoInicio, horarios.isoFim),
          equipe_id,
          responsavel_id: userId,
          etapa: etapa_atual,
        })
        .eq("id", eventoId);

      if (evErr) return { ok: false, message: evErr.message };
    }

    revalidateOsPaths();
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error updating work order",
    };
  }
}
