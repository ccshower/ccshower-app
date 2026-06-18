import {
  AGENDA_EVENTO_COLUMNS,
  compareAgendaEventoStartAsc,
  compareAgendaEventoStartDesc,
  hasAgendaEventoStart,
  mapVisitaInicialResumo,
} from "@/lib/ordens-servico/agenda-evento-query";
import { enrichEventosTimeline } from "@/lib/ordens-servico/enrich-eventos-timeline";
import { createClient } from "@/lib/supabase/server";
import { OS_ANEXO_TIPO_CNC } from "@/lib/ordens-servico/separation-list";
import { OS_ANEXOS_BUCKET } from "@/lib/ordens-servico/visita-comercial";
import type { AgendaEvento, Fornecedor, OrdemServicoWithRelations, OsAnexo, OsSeparationListItem } from "@/lib/types/database";

export async function loadOrdemServicoDetalhe(
  id: string,
): Promise<{ data: OrdemServicoWithRelations | null; error?: string }> {
  const supabase = await createClient();

  const { data: os, error: osErr } = await supabase
    .from("ordens_servico")
    .select("*")
    .eq("id", id)
    .single();

  if (osErr || !os) {
    return { data: null, error: osErr?.message ?? "OS nao encontrada" };
  }

  const [
    { data: cliente },
    { data: equipe },
    { data: responsavel },
    { data: criador },
    { data: eventos },
    { data: listaSeparacao },
    { data: cncRows },
    { data: bloqueioAtivo },
    { data: ambientesRows },
    { data: anexosVisitaRows },
  ] = await Promise.all([
      supabase
        .from("clientes")
        .select(
          "id, nome, telefone, email, endereco_formatado, tipo_cliente, observacoes, google_maps_url, latitude, longitude",
        )
        .eq("id", os.cliente_id)
        .maybeSingle(),
      (os.equipe_atual_id ?? os.equipe_id)
        ? supabase
            .from("equipes")
            .select("id, nome, cor_primaria")
            .eq("id", (os.equipe_atual_id ?? os.equipe_id) as string)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      os.responsavel_id
        ? supabase
            .from("usuarios")
            .select("id, nome")
            .eq("id", os.responsavel_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      os.criado_por
        ? supabase
            .from("usuarios")
            .select("id, nome")
            .eq("id", os.criado_por)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("agenda_eventos")
        .select(AGENDA_EVENTO_COLUMNS)
        .eq("ordem_servico_id", id)
        .order("data_inicio", { ascending: false }),
      supabase
        .from("os_separation_list_items")
        .select("*, catalogo_itens ( id, nome, categoria, unidade )")
        .eq("ordem_servico_id", id)
        .order("sort_order", { ascending: true })
        .order("criado_em", { ascending: true }),
      supabase
        .from("os_anexos")
        .select("*")
        .eq("ordem_servico_id", id)
        .eq("tipo", OS_ANEXO_TIPO_CNC)
        .order("criado_em", { ascending: false }),
      supabase
        .from("os_crashes")
        .select("*")
        .eq("ordem_servico_id", id)
        .eq("status", "ativo")
        .maybeSingle(),
      supabase
        .from("os_ambientes")
        .select("*")
        .eq("ordem_servico_id", id)
        .eq("ativo", true)
        .order("sort_order", { ascending: true })
        .order("criado_em", { ascending: true }),
      supabase
        .from("os_anexos")
        .select("*")
        .eq("ordem_servico_id", id)
        .eq("tipo", "technical_visit")
        .order("criado_em", { ascending: false }),
    ]);

  const lista = ((eventos ?? []) as unknown as AgendaEvento[]).sort(
    compareAgendaEventoStartDesc,
  );
  const eventosTimeline = await enrichEventosTimeline(supabase, lista);
  const visitasTecnicas = lista.filter((e) => e.tipo_evento === "technical_visit");
  const visita =
    visitasTecnicas.length > 0
      ? [...visitasTecnicas].sort(compareAgendaEventoStartAsc)[0]!
      : null;

  const instalacoesAgendadas = lista.filter(
    (e) =>
      e.tipo_evento === "installation" &&
      e.status !== "cancelled" &&
      hasAgendaEventoStart(e),
  );
  const instalacaoAgendada =
    instalacoesAgendadas.length > 0
      ? [...instalacoesAgendadas].sort(compareAgendaEventoStartAsc)[0]!
      : null;

  const instalacaoResumo = mapVisitaInicialResumo(instalacaoAgendada);

  let fornecedor: OrdemServicoWithRelations["fornecedor"] = null;
  if (os.fornecedor_id) {
    const { data: fornRow } = await supabase
      .from("fornecedores")
      .select("id, nome")
      .eq("id", os.fornecedor_id as string)
      .maybeSingle();
    if (fornRow) {
      fornecedor = fornRow as Pick<Fornecedor, "id" | "nome">;
    }
  }

  const anexos_cnc: OrdemServicoWithRelations["anexos_cnc"] = [];
  for (const row of cncRows ?? []) {
    const { data: signed } = await supabase.storage
      .from(OS_ANEXOS_BUCKET)
      .createSignedUrl(row.storage_path as string, 3600);
    anexos_cnc.push({
      ...(row as OsAnexo),
      url: signed?.signedUrl ?? "",
    });
  }
  const anexo_cnc = anexos_cnc[0] ?? null;

  const anexos_visita: OrdemServicoWithRelations["anexos_visita"] = [];
  for (const row of anexosVisitaRows ?? []) {
    const { data: signed } = await supabase.storage
      .from(OS_ANEXOS_BUCKET)
      .createSignedUrl(row.storage_path as string, 3600);
    anexos_visita.push({
      ...(row as OsAnexo),
      url: signed?.signedUrl ?? "",
    });
  }

  return {
    data: {
      ...os,
      cliente: cliente ?? null,
      equipe: equipe ?? null,
      responsavel: responsavel ?? null,
      criado_por_usuario: criador ?? null,
      visita_inicial: mapVisitaInicialResumo(visita),
      instalacao_agendada:
        instalacaoAgendada && instalacaoResumo
          ? {
              id: instalacaoAgendada.id,
              data_inicio: instalacaoResumo.data_inicio,
              data_fim: instalacaoResumo.data_fim,
              status: instalacaoAgendada.status,
              tipo_evento: instalacaoAgendada.tipo_evento,
              equipe_id: instalacaoAgendada.equipe_id,
            }
          : null,
      fornecedor,
      eventos: eventosTimeline,
      lista_separacao: ((listaSeparacao ?? []) as Array<
        OsSeparationListItem & {
          catalogo_itens: OsSeparationListItem["catalogo_item"];
        }
      >).map(({ catalogo_itens, ...row }) => ({
        ...row,
        catalogo_item: catalogo_itens ?? null,
      })),
      anexo_cnc,
      anexos_cnc,
      anexos_visita,
      ambientes: (ambientesRows ?? []) as OrdemServicoWithRelations["ambientes"],
      bloqueio_ativo: bloqueioAtivo ?? null,
    },
  };
}
