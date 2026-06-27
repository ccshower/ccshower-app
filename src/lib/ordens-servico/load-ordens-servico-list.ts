import {
  AGENDA_EVENTO_VISITA_OS_SELECT,
  compareAgendaEventoStartAsc,
  mapVisitaInicialResumo,
} from "@/lib/ordens-servico/agenda-evento-query";
import { loadOrdemServicoFormData } from "@/lib/ordens-servico/form-data";
import { loadOsIdsComBloqueioAtivo } from "@/lib/ordens-servico/load-os-bloqueio-ativo-ids";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrdemServico, OrdemServicoWithRelations, TipoCliente } from "@/lib/types/database";

export type LoadOrdensServicoListResult = {
  ordens: OrdemServicoWithRelations[];
  error: string | null;
};

/** Lista completa de OS (todas etapas e status) para busca e histórico. */
export async function loadOrdensServicoList(
  supabase: SupabaseClient,
): Promise<LoadOrdensServicoListResult> {
  const { data: ordens, error: eOs } = await supabase
    .from("ordens_servico")
    .select("*")
    .order("atualizado_em", { ascending: false });

  const formData = await loadOrdemServicoFormData();

  if (eOs || formData.error) {
    return {
      ordens: [],
      error: eOs?.message ?? formData.error ?? "Error loading work orders",
    };
  }

  const equipes = formData.equipes;
  const usuarios = formData.usuarios;

  const clienteIds = [
    ...new Set(
      ((ordens ?? []) as OrdemServico[])
        .map((o) => o.cliente_id)
        .filter(Boolean),
    ),
  ];

  const clienteMap = new Map<
    string,
    {
      id: string;
      nome: string;
      telefone: string;
      email: string | null;
      endereco_formatado: string;
      endereco_linha1: string | null;
      cidade: string | null;
      estado: string | null;
      cep: string | null;
      tipo_cliente: string;
      observacoes: string | null;
      google_maps_url: string | null;
      latitude: number | null;
      longitude: number | null;
    }
  >();

  if (clienteIds.length > 0) {
    const { data: listClientes } = await supabase
      .from("clientes")
      .select(
        "id, nome, telefone, email, endereco_formatado, endereco_linha1, cidade, estado, cep, tipo_cliente, observacoes, google_maps_url, latitude, longitude",
      )
      .in("id", clienteIds);
    for (const c of listClientes ?? []) {
      clienteMap.set(c.id, c);
    }
  }
  const equipeMap = new Map(equipes.map((e) => [e.id, e]));
  const userMap = new Map(usuarios.map((u) => [u.id, u]));

  const extraEquipeIds = [
    ...new Set(
      ((ordens ?? []) as OrdemServico[])
        .map((o) => o.equipe_atual_id ?? o.equipe_id)
        .filter((id): id is string => Boolean(id) && !equipeMap.has(id as string)),
    ),
  ];
  if (extraEquipeIds.length > 0) {
    const { data: extraEq } = await supabase
      .from("equipes")
      .select("id, nome, cor_primaria, cor_secundaria, ativo, criado_em, atualizado_em")
      .in("id", extraEquipeIds);
    for (const eq of extraEq ?? []) {
      equipeMap.set(eq.id, eq as (typeof equipes)[0]);
    }
  }

  const osIds = ((ordens ?? []) as OrdemServico[]).map((o) => o.id);
  const visitaByOs = new Map<
    string,
    {
      id: string;
      ordem_servico_id: string;
      data_inicio: string | null;
      data_fim: string | null;
      data_evento: string | null;
      hora_evento: string | null;
      status: string;
      tipo_evento: string;
    }
  >();

  if (osIds.length > 0) {
    const { data: eventos } = await supabase
      .from("agenda_eventos")
      .select(AGENDA_EVENTO_VISITA_OS_SELECT)
      .in("ordem_servico_id", osIds)
      .eq("tipo_evento", "technical_visit");

    for (const ev of eventos ?? []) {
      const osId = ev.ordem_servico_id as string;
      const existing = visitaByOs.get(osId);
      if (!existing || compareAgendaEventoStartAsc(ev, existing) < 0) {
        visitaByOs.set(osId, ev);
      }
    }
  }

  const bloqueioAtivoIds = await loadOsIdsComBloqueioAtivo(supabase, osIds);

  const merged: OrdemServicoWithRelations[] = ((ordens ?? []) as OrdemServico[]).map(
    (os) => {
      const c = clienteMap.get(os.cliente_id);
      const eqId = os.equipe_atual_id ?? os.equipe_id;
      const eq = eqId ? equipeMap.get(eqId) : undefined;
      const resp = os.responsavel_id ? userMap.get(os.responsavel_id) : undefined;
      const visita = visitaByOs.get(os.id) ?? null;
      return {
        ...os,
        observacoes: os.observacoes ?? null,
        cliente: c
          ? {
              id: c.id,
              nome: c.nome,
              telefone: c.telefone,
              email: c.email ?? null,
              endereco_formatado: c.endereco_formatado,
              endereco_linha1: c.endereco_linha1 ?? null,
              cidade: c.cidade ?? null,
              estado: c.estado ?? null,
              cep: c.cep ?? null,
              tipo_cliente: c.tipo_cliente as TipoCliente,
              observacoes: c.observacoes ?? null,
              latitude: c.latitude ?? null,
              longitude: c.longitude ?? null,
              google_maps_url: c.google_maps_url ?? null,
            }
          : null,
        possui_instalacao: os.possui_instalacao ?? true,
        etapa_atual: os.etapa_atual ?? "commercial",
        status_atual: os.status_atual ?? "commercial_pending",
        equipe_atual_id: os.equipe_atual_id ?? os.equipe_id,
        equipe: eq
          ? {
              id: eq.id,
              nome: eq.nome,
              cor_primaria: eq.cor_primaria,
              cor_secundaria: eq.cor_secundaria,
            }
          : null,
        responsavel: resp ? { id: resp.id, nome: resp.nome } : null,
        visita_inicial: mapVisitaInicialResumo(visita),
        instalacao_agendada: null,
        fornecedor: null,
        tem_bloqueio_ativo: bloqueioAtivoIds.has(os.id),
      };
    },
  );

  return { ordens: merged, error: null };
}
