"use server";

import { revalidatePath } from "next/cache";

import { transicionarEtapaOrdemServico } from "@/app/ordens-servico/actions";
import { validarSlotVisitaDisponivel } from "@/app/ordens-servico/agenda-disponibilidade";
import { verificarOsFluxoLiberado } from "@/app/ordens-servico/bloqueio-operacional-actions";
import {
  parseSeparationListItemInput,
  type SeparationListItemInput,
} from "@/lib/ordens-servico/separation-list";
import {
  AGENDA_EVENTO_DATETIME_COLUMNS,
  hasAgendaEventoStart,
  spreadAgendaEventoDatetime,
  spreadAgendaEventoRange,
} from "@/lib/ordens-servico/agenda-evento-query";
import { buildAgendaIntervalIso, parseVisitaDateTime } from "@/lib/ordens-servico/datetime";
import { compararYmd, hojeOperacionalYmd } from "@/lib/ordens-servico/visita-slots";
import { parseValorEtapaInput } from "@/lib/ordens-servico/os-valores-etapa";
import {
  buildOperationalSnapshot,
  parseOsStage,
} from "@/lib/ordens-servico/operacional-snapshot";
import {
  debugFilterEquipesForStage,
  validateEquipeIdForStage,
  type EquipeStageFilterDebug,
} from "@/lib/ordens-servico/workflow-equipe";
import { createClient } from "@/lib/supabase/server";
import type { CatalogoItem, Equipe, Fornecedor, OsSeparationListItem } from "@/lib/types/database";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

type SeparationListRow = OsSeparationListItem & {
  catalogo_itens: Pick<CatalogoItem, "id" | "nome" | "categoria" | "unidade"> | null;
};

function mapSeparationListRow(row: SeparationListRow): OsSeparationListItem {
  const { catalogo_itens, ...rest } = row;
  return {
    ...rest,
    catalogo_item: catalogo_itens,
  };
}

function revalidateOs(osId: string) {
  revalidatePath("/ordens-servico");
  revalidatePath("/admin/centro-operacional");
  revalidatePath("/operacao");
  revalidatePath("/financeiro");
  revalidatePath("/calendar");
  revalidatePath("/os", "layout");
  revalidatePath(`/os/${osId}`);
}

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired");
  return { supabase, userId: user.id };
}

type LoadOsProjectStageResult =
  | { error: string }
  | { os: { id: string; empresa_id: string | null } };

async function loadOsProjectStage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  osId: string,
): Promise<LoadOsProjectStageResult> {
  const { data, error } = await supabase
    .from("ordens_servico")
    .select("id, etapa_atual, empresa_id")
    .eq("id", osId)
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Work order not found" };
  }

  if (parseOsStage(data.etapa_atual as string) !== "project") {
    return { error: "Work order is not in the Project stage" };
  }

  return {
    os: {
      id: data.id as string,
      empresa_id: data.empresa_id as string | null,
    },
  };
}

function mapDbErrorValores(message: string): string {
  if (
    message.includes("valor_comercial") ||
    message.includes("valor_projeto") ||
    message.includes("valor_final")
  ) {
    return "Database out of date: apply migration supabase/migrations/20250602100000_os_valores_etapa.sql in Supabase.";
  }
  return message;
}

function mapDbErrorProjeto(message: string): string {
  return mapDbErrorValores(message);
}

const PROJETO_CONCLUSAO_INCOMPLETA_MSG =
  "You must set supplier, material ETA, and schedule installation before completing the project.";

export async function listarFornecedores(): Promise<{
  itens: Fornecedor[];
  error?: string;
}> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("fornecedores")
      .select("id, nome, ativo, criado_em")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      console.error("[listarFornecedores] Supabase error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      const detail = [error.code, error.message, error.details, error.hint]
        .filter(Boolean)
        .join(" — ");
      return { itens: [], error: detail || error.message };
    }

    if ((data ?? []).length === 0) {
      console.warn(
        "[listarFornecedores] Consulta OK, zero linhas. Verifique RLS/grants em public.fornecedores.",
      );
    }

    return { itens: (data ?? []) as Fornecedor[] };
  } catch (e) {
    console.error("[listarFornecedores] Exception:", e);
    return {
      itens: [],
      error: e instanceof Error ? e.message : "Error listing suppliers",
    };
  }
}

export async function listarEquipesInstalacaoProjeto(): Promise<{
  equipes: Equipe[];
  error?: string;
  debug?: EquipeStageFilterDebug & { queryError?: string };
}> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("equipes")
      .select(
        "id, nome, codigo_operacional, cor_primaria, cor_secundaria, ativo, criado_em, atualizado_em",
      )
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error) {
      console.error("[listarEquipesInstalacaoProjeto] Supabase error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return {
        equipes: [],
        error: [error.code, error.message].filter(Boolean).join(" — "),
        debug: {
          stage: "installation",
          expectedCode: "installation",
          inputTotal: 0,
          matchedTotal: 0,
          rows: [],
          queryError: error.message,
        },
      };
    }

    const todas = (data ?? []) as Equipe[];
    const { filtered, debug } = debugFilterEquipesForStage(todas, "installation");

    console.info("[listarEquipesInstalacaoProjeto] filtro installation:", {
      totalDb: debug.inputTotal,
      totalFiltradas: debug.matchedTotal,
      expectedCode: debug.expectedCode,
      amostra: debug.rows.slice(0, 20),
    });

    if (debug.inputTotal === 0) {
      console.warn(
        "[listarEquipesInstalacaoProjeto] Zero equipes visíveis via RLS. Verifique policy equipes_select_for_os_scheduling.",
      );
    }

    return { equipes: filtered, debug };
  } catch (e) {
    console.error("[listarEquipesInstalacaoProjeto] Exception:", e);
    return {
      equipes: [],
      error: e instanceof Error ? e.message : "Error listing installation teams",
    };
  }
}

export async function salvarFornecedorProjeto(
  osId: string,
  fornecedorId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const loaded = await loadOsProjectStage(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const id = String(fornecedorId ?? "").trim();
    if (!id) {
      return { ok: false, message: "Select a supplier" };
    }

    const { data: forn, error: fornErr } = await supabase
      .from("fornecedores")
      .select("id")
      .eq("id", id)
      .eq("ativo", true)
      .maybeSingle();

    if (fornErr || !forn) {
      return { ok: false, message: "Invalid or inactive supplier" };
    }

    const { error } = await supabase
      .from("ordens_servico")
      .update({ fornecedor_id: id })
      .eq("id", osId);

    if (error) return { ok: false, message: mapDbErrorProjeto(error.message) };
    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error saving supplier",
    };
  }
}

function parseDataPrevistaMaterial(raw: string): { ok: true; value: string } | { ok: false; message: string } {
  const ymd = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return { ok: false, message: "Enter the expected material date" };
  }
  if (compararYmd(ymd, hojeOperacionalYmd()) < 0) {
    return {
      ok: false,
      message:
        "Expected material date cannot be before today.",
    };
  }
  return { ok: true, value: ymd };
}

export async function salvarDataPrevistaMaterial(
  osId: string,
  dataRaw: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const loaded = await loadOsProjectStage(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const parsed = parseDataPrevistaMaterial(dataRaw);
    if (!parsed.ok) return parsed;

    const { error } = await supabase
      .from("ordens_servico")
      .update({ data_prevista_material: parsed.value })
      .eq("id", osId);

    if (error) return { ok: false, message: mapDbErrorProjeto(error.message) };
    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error ? e.message : "Error saving material ETA",
    };
  }
}

export async function agendarInstalacaoProjeto(
  osId: string,
  equipeId: string,
  dataInstalacao: string,
  horaInstalacao: string,
  horaFimInstalacao: string,
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();
    const loaded = await loadOsProjectStage(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const equipe_id = String(equipeId ?? "").trim();
    if (!equipe_id) {
      return { ok: false, message: "Select the installation team" };
    }

    const eqOk = await validateEquipeIdForStage(
      supabase,
      equipe_id,
      "installation",
    );
    if (!eqOk.ok) return { ok: false, message: eqOk.message };

    const intervalo = buildAgendaIntervalIso(
      dataInstalacao,
      horaInstalacao,
      horaFimInstalacao,
    );
    if (!intervalo) {
      return { ok: false, message: "Invalid installation date and time" };
    }

    const { data: osRow, error: osErr } = await supabase
      .from("ordens_servico")
      .select("id, cliente_id, titulo, data_prevista_material")
      .eq("id", osId)
      .single();

    if (osErr || !osRow) {
      return { ok: false, message: osErr?.message ?? "Work order not found" };
    }

    if (osRow.data_prevista_material) {
      const materialYmd = String(osRow.data_prevista_material).slice(0, 10);
      if (compararYmd(dataInstalacao, materialYmd) < 0) {
        return {
          ok: false,
          message:
            "Installation date cannot be before the expected material date.",
        };
      }
    }

    const { data: existente } = await supabase
      .from("agenda_eventos")
      .select("id")
      .eq("ordem_servico_id", osId)
      .eq("tipo_evento", "installation")
      .neq("status", "cancelled")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    const slotOk = await validarSlotVisitaDisponivel(
      equipe_id,
      dataInstalacao,
      horaInstalacao,
      horaFimInstalacao,
      existente?.id ?? null,
    );
    if (!slotOk.ok) {
      if ("conflito" in slotOk && slotOk.conflito) {
        return {
          ok: false,
          message:
            "An installation is already scheduled for this team at this time.",
        };
      }
      return { ok: false, message: slotOk.message };
    }

    const titulo = `Installation — ${osRow.titulo ?? osId}`;
    const payload = {
      ordem_servico_id: osId,
      cliente_id: osRow.cliente_id as string,
      equipe_id,
      responsavel_id: userId,
      tipo_evento: "installation",
      etapa: "installation",
      status: "scheduled",
      titulo,
      descricao: null,
      ...spreadAgendaEventoRange(intervalo.isoInicio, intervalo.isoFim),
    };

    if (existente?.id) {
      const { error: updErr } = await supabase
        .from("agenda_eventos")
        .update(payload)
        .eq("id", existente.id);
      if (updErr) return { ok: false, message: updErr.message };
    } else {
      const { error: insErr } = await supabase
        .from("agenda_eventos")
        .insert(payload);
      if (insErr) return { ok: false, message: insErr.message };
    }

    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error ? e.message : "Error scheduling installation",
    };
  }
}

const AGENDA_STATUS_CANCELADOS = new Set(["cancelled", "cancelado"]);

async function validarProjetoProntoParaConclusao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  osId: string,
): Promise<ActionResult> {
  const { data, error } = await supabase
    .from("ordens_servico")
    .select("fornecedor_id, data_prevista_material")
    .eq("id", osId)
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Work order not found" };
  }

  const fornecedor_id = data.fornecedor_id ?? null;
  const data_prevista_material = data.data_prevista_material
    ? String(data.data_prevista_material).slice(0, 10)
    : null;

  const { data: instalacaoRows, error: evErr } = await supabase
    .from("agenda_eventos")
    .select(`${AGENDA_EVENTO_DATETIME_COLUMNS}, equipe_id, criado_em`)
    .eq("ordem_servico_id", osId)
    .eq("tipo_evento", "installation")
    .order("criado_em", { ascending: false });

  if (evErr) return { ok: false, message: evErr.message };

  const instalacaoAgendada = (instalacaoRows ?? []).find(
    (ev) =>
      !AGENDA_STATUS_CANCELADOS.has(ev.status ?? "") &&
      hasAgendaEventoStart(ev),
  );

  const instalacaoParsed = instalacaoAgendada
    ? parseVisitaDateTime(
        instalacaoAgendada.data_inicio ??
          instalacaoAgendada.data_evento ??
          "",
      )
    : { data: "", hora: "" };

  const debug = {
    fornecedor_id,
    data_prevista_material,
    equipe_instalacao_id: instalacaoAgendada?.equipe_id ?? null,
    data_instalacao: instalacaoParsed.data || null,
    hora_instalacao: instalacaoParsed.hora || null,
    instalacao_status: instalacaoAgendada?.status ?? null,
    instalacao_evento_id: instalacaoAgendada?.id ?? null,
    tem_fornecedor: Boolean(fornecedor_id),
    tem_data_material: Boolean(data_prevista_material),
    tem_instalacao_agendada: Boolean(instalacaoAgendada),
  };

  console.log("[validarProjetoProntoParaConclusao]", { osId, ...debug });

  if (!fornecedor_id || !data_prevista_material) {
    console.warn("[validarProjetoProntoParaConclusao] bloqueado: fornecedor ou material", {
      osId,
      falta_fornecedor: !fornecedor_id,
      falta_data_material: !data_prevista_material,
    });
    return { ok: false, message: PROJETO_CONCLUSAO_INCOMPLETA_MSG };
  }

  if (!instalacaoAgendada) {
    console.warn("[validarProjetoProntoParaConclusao] bloqueado: instalação não agendada", {
      osId,
      eventos_instalacao_encontrados: (instalacaoRows ?? []).length,
      eventos_instalacao: (instalacaoRows ?? []).map((ev) => ({
        id: ev.id,
        status: ev.status,
        equipe_id: ev.equipe_id,
        tem_data: hasAgendaEventoStart(ev),
      })),
    });
    return { ok: false, message: PROJETO_CONCLUSAO_INCOMPLETA_MSG };
  }

  return { ok: true, id: osId };
}

/** Persiste apenas `valor_projeto` — não altera valor comercial nem final. */
export async function salvarValorProjeto(
  osId: string,
  valorRaw: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const loaded = await loadOsProjectStage(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const parsed = parseValorEtapaInput(valorRaw);
    if (!parsed.ok) return parsed;

    const { error } = await supabase
      .from("ordens_servico")
      .update({ valor_projeto: parsed.value })
      .eq("id", osId);

    if (error) return { ok: false, message: mapDbErrorValores(error.message) };
    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error saving project amount",
    };
  }
}

export async function listarCatalogoItens(): Promise<{
  itens: CatalogoItem[];
  error?: string;
}> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("catalogo_itens")
      .select("id, nome, categoria, unidade, quantidade, ativo, criado_em")
      .eq("ativo", true)
      .order("categoria", { ascending: true })
      .order("nome", { ascending: true });

    if (error) return { itens: [], error: error.message };
    return {
      itens: (data ?? []).map((row) => ({
        ...(row as CatalogoItem),
        quantidade: Number((row as CatalogoItem).quantidade ?? 0),
      })),
    };
  } catch (e) {
    return {
      itens: [],
      error: e instanceof Error ? e.message : "Error listing catalog",
    };
  }
}

export async function listarItensListaSeparacao(
  osId: string,
): Promise<{ itens: OsSeparationListItem[]; error?: string }> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("os_separation_list_items")
      .select(
        "*, catalogo_itens ( id, nome, categoria, unidade )",
      )
      .eq("ordem_servico_id", osId)
      .order("sort_order", { ascending: true })
      .order("criado_em", { ascending: true });

    if (error) return { itens: [], error: error.message };
    return {
      itens: ((data ?? []) as SeparationListRow[]).map(mapSeparationListRow),
    };
  } catch (e) {
    return {
      itens: [],
      error: e instanceof Error ? e.message : "Error listing items",
    };
  }
}

export async function salvarListaSeparacao(
  osId: string,
  itensRaw: SeparationListItemInput[],
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();
    const loaded = await loadOsProjectStage(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const parsed: SeparationListItemInput[] = [];
    for (const item of itensRaw) {
      const r = parseSeparationListItemInput(item);
      if (!r.ok) return r;
      parsed.push(r.value);
    }

    const catalogIds = [...new Set(parsed.map((item) => item.item_id))];
    if (catalogIds.length > 0) {
      const { data: catalogRows, error: catErr } = await supabase
        .from("catalogo_itens")
        .select("id")
        .in("id", catalogIds)
        .eq("ativo", true);

      if (catErr) return { ok: false, message: catErr.message };
      if ((catalogRows ?? []).length !== catalogIds.length) {
        return { ok: false, message: "Invalid or inactive catalog item" };
      }
    }

    const { error: delErr } = await supabase
      .from("os_separation_list_items")
      .delete()
      .eq("ordem_servico_id", osId);

    if (delErr) return { ok: false, message: delErr.message };

    if (parsed.length === 0) {
      revalidateOs(osId);
      return { ok: true, id: osId };
    }

    const rows = parsed.map((item, index) => ({
      ordem_servico_id: osId,
      empresa_id: loaded.os.empresa_id,
      item_id: item.item_id,
      quantity: item.quantity,
      notes: item.notes ?? null,
      sort_order: index,
      criado_por: userId,
    }));

    const { error: insErr } = await supabase
      .from("os_separation_list_items")
      .insert(rows);

    if (insErr) return { ok: false, message: insErr.message };

    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error saving list",
    };
  }
}

export async function salvarObservacoesInstalacao(
  osId: string,
  notes: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const loaded = await loadOsProjectStage(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const { error } = await supabase
      .from("ordens_servico")
      .update({ installation_notes: notes.trim() || null })
      .eq("id", osId);

    if (error) return { ok: false, message: error.message };

    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error saving notes",
    };
  }
}

type LoadOsParaFinalizarProjetoResult =
  | { error: string }
  | {
      os: {
        id: string;
        cliente_id: string;
        equipe_id: string;
        responsavel_id: string | null;
      };
    };

async function loadOsParaFinalizarProjeto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  osId: string,
): Promise<LoadOsParaFinalizarProjetoResult> {
  const { data, error } = await supabase
    .from("ordens_servico")
    .select(
      "id, cliente_id, etapa_atual, equipe_atual_id, equipe_id, responsavel_id",
    )
    .eq("id", osId)
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Work order not found" };
  }

  if (parseOsStage(data.etapa_atual as string) !== "project") {
    return { error: "Work order is not in the Project stage" };
  }

  const equipe_id =
    (data.equipe_atual_id as string | null) ??
    (data.equipe_id as string | null);

  if (!equipe_id) {
    return { error: "Work order has no team to complete project" };
  }

  return {
    os: {
      id: data.id as string,
      cliente_id: data.cliente_id as string,
      equipe_id,
      responsavel_id: data.responsavel_id as string | null,
    },
  };
}

async function registrarEventoProjetoConcluido(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    ordem_servico_id: string;
    cliente_id: string;
    equipe_id: string;
    responsavel_id: string | null;
  },
): Promise<ActionResult> {
  const { error } = await supabase.from("agenda_eventos").insert({
    ordem_servico_id: params.ordem_servico_id,
    cliente_id: params.cliente_id,
    equipe_id: params.equipe_id,
    responsavel_id: params.responsavel_id,
    tipo_evento: "project_completed",
    etapa: "project",
    status: "completed",
    titulo: "project_completed",
    descricao: null,
    ...spreadAgendaEventoDatetime(new Date().toISOString()),
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, id: params.ordem_servico_id };
}

export async function finalizarProjeto(osId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();
    const bloqueioFluxo = await verificarOsFluxoLiberado(supabase, osId);
    if (bloqueioFluxo) return bloqueioFluxo;

    const loaded = await loadOsParaFinalizarProjeto(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const { os } = loaded;

    const pronto = await validarProjetoProntoParaConclusao(supabase, osId);
    if (!pronto.ok) return pronto;

    const ev = await registrarEventoProjetoConcluido(supabase, {
      ordem_servico_id: osId,
      cliente_id: os.cliente_id,
      equipe_id: os.equipe_id,
      responsavel_id: userId,
    });
    if (!ev.ok) return ev;

    const trans = await transicionarEtapaOrdemServico(osId, "installation");
    if (!trans.ok) return trans;

    const { data: evInst } = await supabase
      .from("agenda_eventos")
      .select("equipe_id")
      .eq("ordem_servico_id", osId)
      .eq("tipo_evento", "installation")
      .eq("status", "scheduled")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (evInst?.equipe_id) {
      const equipeInstalacao = evInst.equipe_id as string;
      const snapshot = buildOperationalSnapshot(
        equipeInstalacao,
        "installation",
        "scheduled",
      );
      const { error: syncErr } = await supabase
        .from("ordens_servico")
        .update({
          equipe_id: equipeInstalacao,
          equipe_atual_id: snapshot.equipe_atual_id,
          status: "scheduled",
          status_atual: snapshot.status_atual,
          etapa_atual: snapshot.etapa_atual,
        })
        .eq("id", osId);
      if (syncErr) return { ok: false, message: syncErr.message };
    }

    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error completing project",
    };
  }
}
