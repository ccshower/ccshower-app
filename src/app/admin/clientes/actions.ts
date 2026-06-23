"use server";

import { revalidatePath } from "next/cache";

import {
  mapDbErrorContractor,
  parseClienteContractorFromForm,
} from "@/lib/clientes/cliente-contractor";
import { parseClientType } from "@/lib/clientes/tipo-cliente";
import {
  mapDbErrorLeadSource,
  parseLeadSourceFromForm,
} from "@/lib/clientes/lead-source";
import { validateEquipeOperacional } from "@/lib/equipes/validate-equipe-operacional";
import { validateEquipeIdForStage, resolveDefaultTeamForStage } from "@/lib/ordens-servico/workflow-equipe";
import { buildOperationalSnapshot } from "@/lib/ordens-servico/operacional-snapshot";
import { buildInitialCommercialOsTitulo } from "@/lib/ordens-servico/os-operational-title";
import { resolveEmpresaId } from "@/lib/ordens-servico/resolve-empresa-id";
import {
  loadUnidadeIdFromEquipe,
  syncUnidadeOperacionalCliente,
} from "@/lib/unidades/sync-unidade-operacional";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true; id?: string; nome?: string }
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

  if (!user) {
    throw new Error("Sessao expirada");
  }

  const { data: row, error } = await supabase
    .from("usuarios")
    .select("id, equipe_id, ativo, tipo_usuario, pode_ver_todas_equipes")
    .eq("id", user.id)
    .single();

  if (error || !row?.ativo) {
    throw new Error("Sem permissao");
  }

  return { supabase, usuario: row as ActiveUsuario, userId: user.id };
}

function emptyToNull(v: FormDataEntryValue | null) {
  const t = String(v ?? "").trim();
  return t.length ? t : null;
}

function readNumber(v: FormDataEntryValue | null) {
  const t = String(v ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function canChooseEquipe(usuario: ActiveUsuario) {
  return usuario.tipo_usuario === "admin" || usuario.pode_ver_todas_equipes;
}

function getEquipeId(formData: FormData, usuario: ActiveUsuario) {
  const requested = emptyToNull(formData.get("equipe_id"));
  if (canChooseEquipe(usuario)) return requested;
  return requested ?? usuario.equipe_id;
}

async function resolveClienteEquipeId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  usuario: ActiveUsuario,
): Promise<{ ok: true; equipeId: string } | { ok: false; message: string }> {
  const candidate = getEquipeId(formData, usuario);

  if (candidate) {
    const eqVal = await validateEquipeOperacional(supabase, candidate);
    if (!eqVal.ok) return eqVal;

    const eqStage = await validateEquipeIdForStage(
      supabase,
      eqVal.equipe_id,
      "commercial",
    );
    if (eqStage.ok) return { ok: true, equipeId: eqVal.equipe_id };
  }

  const { equipeId, error } = await resolveDefaultTeamForStage(
    supabase,
    "commercial",
    usuario.equipe_id,
  );

  if (!equipeId) {
    return {
      ok: false,
      message:
        error ??
        'No commercial team configured. Run supabase/scripts/catch-up-commercial-equipe.sql in Supabase or create a team named "Commercial".',
    };
  }

  return { ok: true, equipeId };
}

export async function criarCliente(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, usuario, userId } = await requireActiveSupabase();
    const nome = String(formData.get("nome") ?? "").trim();
    const telefone = String(formData.get("telefone") ?? "").trim();
    const endereco_formatado = String(formData.get("endereco_formatado") ?? "").trim();
    const tipo_cliente = parseClientType(
      String(formData.get("tipo_cliente") ?? ""),
    );

    if (!nome || !telefone || !endereco_formatado) {
      return { ok: false, message: "Nome, telefone e endereco sao obrigatorios" };
    }

    const lead = parseLeadSourceFromForm(formData, { required: false });
    if (!lead.ok) return lead;

    const contractorParsed = parseClienteContractorFromForm(tipo_cliente, formData);
    if (!contractorParsed.ok) return contractorParsed;

    const equipeResolved = await resolveClienteEquipeId(supabase, formData, usuario);
    if (!equipeResolved.ok) return equipeResolved;

    const equipeWorkOrder = equipeResolved.equipeId;
    const unidade_id = await loadUnidadeIdFromEquipe(supabase, equipeWorkOrder);

    const empresa_id = await resolveEmpresaId(supabase, { userId });
    if (!empresa_id) {
      return {
        ok: false,
        message:
          'No active company (empresas) found. Run supabase/scripts/catch-up-empresa-id-unidade.sql in Supabase.',
      };
    }

    const { data: created, error } = await supabase
      .from("clientes")
      .insert({
        nome,
        telefone,
        tipo_cliente,
        email: emptyToNull(formData.get("email")),
        endereco_formatado,
        endereco_linha1: emptyToNull(formData.get("endereco_linha1")),
        cidade: emptyToNull(formData.get("cidade")),
        estado: emptyToNull(formData.get("estado")),
        cep: emptyToNull(formData.get("cep")),
        pais: emptyToNull(formData.get("pais")) ?? "US",
        google_place_id: emptyToNull(formData.get("google_place_id")),
        latitude: readNumber(formData.get("latitude")),
        longitude: readNumber(formData.get("longitude")),
        google_maps_url: emptyToNull(formData.get("google_maps_url")),
        observacoes: emptyToNull(formData.get("observacoes")),
        origem_lead: lead.origem_lead,
        origem_lead_outro: lead.origem_lead_outro,
        contractor_id: contractorParsed.contractor_id,
        equipe_id: equipeWorkOrder,
        empresa_id,
        ...(unidade_id ? { unidade_id } : {}),
        criado_por: userId,
        ativo: true,
      })
      .select("id, nome, equipe_id")
      .single();

    if (error) {
      return {
        ok: false,
        message: mapDbErrorLeadSource(mapDbErrorContractor(error.message)),
      };
    }

    // Work order inicial (fluxo vivo) — nasce automaticamente ao salvar cliente.
    const snapshot = buildOperationalSnapshot(
      equipeWorkOrder,
      "commercial",
      "open",
    );

    const { error: osErr } = await supabase.from("ordens_servico").insert({
      empresa_id,
      cliente_id: created.id,
      titulo: buildInitialCommercialOsTitulo(created.nome),
      descricao: null,
      observacoes: null,
      anotacoes_tecnicas: null,
      status: "open",
      equipe_id: equipeWorkOrder,
      responsavel_id: null,
      possui_instalacao: true,
      equipe_atual_id: snapshot.equipe_atual_id,
      etapa_atual: snapshot.etapa_atual,
      status_atual: snapshot.status_atual, // no_visit
      criado_por: userId,
      ativo: true,
    });

    if (osErr) {
      return {
        ok: false,
        message: `Cliente criado, mas falhou criar Work Order inicial: ${osErr.message}`,
      };
    }

    revalidatePath("/clientes");
    revalidatePath("/admin/clientes");
    revalidatePath("/admin/centro-operacional");
    revalidatePath("/operacao");
    revalidatePath("/ordens-servico");
    return { ok: true, id: created.id, nome: created.nome };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao criar cliente" };
  }
}

export async function atualizarCliente(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, usuario } = await requireActiveSupabase();
    const id = String(formData.get("id") ?? "");
    const nome = String(formData.get("nome") ?? "").trim();
    const telefone = String(formData.get("telefone") ?? "").trim();
    const endereco_formatado = String(formData.get("endereco_formatado") ?? "").trim();
    const tipo_cliente = parseClientType(
      String(formData.get("tipo_cliente") ?? ""),
    );

    if (!id) return { ok: false, message: "ID ausente" };
    if (!nome || !telefone || !endereco_formatado) {
      return { ok: false, message: "Nome, telefone e endereco sao obrigatorios" };
    }

    const lead = parseLeadSourceFromForm(formData, { required: false });
    if (!lead.ok) return lead;

    const contractorParsed = parseClienteContractorFromForm(tipo_cliente, formData);
    if (!contractorParsed.ok) return contractorParsed;

    const equipeResolved = await resolveClienteEquipeId(supabase, formData, usuario);
    if (!equipeResolved.ok) return equipeResolved;

    const unidade_id = await loadUnidadeIdFromEquipe(
      supabase,
      equipeResolved.equipeId,
    );

    const { error } = await supabase
      .from("clientes")
      .update({
        nome,
        telefone,
        tipo_cliente,
        email: emptyToNull(formData.get("email")),
        endereco_formatado,
        endereco_linha1: emptyToNull(formData.get("endereco_linha1")),
        cidade: emptyToNull(formData.get("cidade")),
        estado: emptyToNull(formData.get("estado")),
        cep: emptyToNull(formData.get("cep")),
        pais: emptyToNull(formData.get("pais")) ?? "US",
        google_place_id: emptyToNull(formData.get("google_place_id")),
        latitude: readNumber(formData.get("latitude")),
        longitude: readNumber(formData.get("longitude")),
        google_maps_url: emptyToNull(formData.get("google_maps_url")),
        observacoes: emptyToNull(formData.get("observacoes")),
        origem_lead: lead.origem_lead,
        origem_lead_outro: lead.origem_lead_outro,
        contractor_id: contractorParsed.contractor_id,
        equipe_id: equipeResolved.equipeId,
        ...(unidade_id ? { unidade_id } : {}),
      })
      .eq("id", id);

    if (error) {
      return {
        ok: false,
        message: mapDbErrorLeadSource(mapDbErrorContractor(error.message)),
      };
    }

    await syncUnidadeOperacionalCliente(supabase, id, unidade_id);

    revalidatePath("/clientes");
    revalidatePath("/admin/clientes");
    revalidatePath("/admin/centro-operacional");
    revalidatePath("/operacao");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao atualizar cliente",
    };
  }
}

export async function setClienteAtivo(id: string, ativo: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await requireActiveSupabase();
    const { error } = await supabase.from("clientes").update({ ativo }).eq("id", id);

    if (error) return { ok: false, message: error.message };

    revalidatePath("/clientes");
    revalidatePath("/admin/clientes");
    revalidatePath("/admin/centro-operacional");
    revalidatePath("/operacao");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao atualizar status",
    };
  }
}
