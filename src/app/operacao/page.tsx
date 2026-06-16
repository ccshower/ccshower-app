import { redirect } from "next/navigation";

import { getCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { canViewFinancialValues } from "@/lib/auth/financial-visibility";
import {
  canFilterCalendarByEquipe,
  ordemServicoEquipeFilterOr,
  resolveCalendarEquipeFilter,
  type CalendarEquipeOption,
} from "@/lib/calendar/calendar-equipe-filter";
import { createClient } from "@/lib/supabase/server";
import {
  ordemServicoMultiEquipeFilterOr,
  resolveOperacaoEquipeIds,
} from "@/lib/ordens-servico/operacao-equipe-filter";

import { CampoPageFrame } from "@/components/layout/campo-page-frame";
import {
  AGENDA_EVENTO_VISITA_OS_SELECT,
  compareAgendaEventoStartAsc,
  mapVisitaInicialResumo,
} from "@/lib/ordens-servico/agenda-evento-query";
import { loadOsIdsComBloqueioAtivo } from "@/lib/ordens-servico/load-os-bloqueio-ativo-ids";
import type { OrdemServico, OrdemServicoWithRelations } from "@/lib/types/database";

import { OperacaoClient } from "./operacao-client";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ equipe?: string }>;
};

export default async function OperacaoPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { usuario } = await getCurrentUsuario();
  if (!usuario?.ativo) redirect("/login?erro=inativo");

  const params = await searchParams;
  const equipeFilterId = resolveCalendarEquipeFilter(usuario, params.equipe);
  const canFilterEquipes = canFilterCalendarByEquipe(usuario);

  let viewerEquipe: {
    id: string;
    nome: string;
    codigo_operacional: string | null;
    cor_primaria: string;
    ativo: boolean;
  } | null = null;
  if (usuario.equipe_id) {
    const { data: eq } = await supabase
      .from("equipes")
      .select("id, nome, codigo_operacional, cor_primaria, ativo")
      .eq("id", usuario.equipe_id)
      .maybeSingle();
    viewerEquipe = eq;
  }
  const viewerCanSeeFinancial = canViewFinancialValues(usuario, viewerEquipe);

  const operacaoEquipeIds = await resolveOperacaoEquipeIds(
    supabase,
    usuario,
    viewerEquipe,
  );

  let osQuery = supabase
    .from("ordens_servico")
    .select("*")
    .eq("ativo", true)
    .in("status", ["open", "scheduled", "in_progress"])
    .order("atualizado_em", { ascending: false });

  if (canFilterEquipes && equipeFilterId) {
    osQuery = osQuery.or(ordemServicoEquipeFilterOr(equipeFilterId));
  } else if (!canFilterEquipes && operacaoEquipeIds.length > 0) {
    const teamOr = ordemServicoMultiEquipeFilterOr(operacaoEquipeIds);
    if (teamOr) osQuery = osQuery.or(teamOr);
  }

  const [{ data: ordens, error: eOs }, equipesRes] = await Promise.all([
    osQuery,
    canFilterEquipes
      ? supabase
          .from("equipes")
          .select("id, nome, cor_primaria")
          .eq("ativo", true)
          .order("nome", { ascending: true })
      : Promise.resolve({ data: [] as CalendarEquipeOption[], error: null }),
  ]);

  const equipes = (equipesRes.data ?? []) as CalendarEquipeOption[];

  if (eOs) {
    return (
      <CampoPageFrame tab="operacao" operational>
        <div className="rounded-sm border border-cc-red-soft bg-cc-red-soft p-4 text-sm text-cc-red">
          Error loading operations: {eOs.message}
        </div>
      </CampoPageFrame>
    );
  }

  const osIds = ((ordens ?? []) as OrdemServico[]).map((o) => o.id);
  const clienteIds = [
    ...new Set(((ordens ?? []) as OrdemServico[]).map((o) => o.cliente_id)),
  ];
  const equipeIds = [
    ...new Set(
      ((ordens ?? []) as OrdemServico[])
        .map((o) => o.equipe_atual_id ?? o.equipe_id)
        .filter(Boolean),
    ),
  ] as string[];

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

  const [{ data: clientes }, { data: equipesRows }] = await Promise.all([
    clienteIds.length > 0
      ? supabase
          .from("clientes")
          .select(
            "id, nome, telefone, email, endereco_formatado, tipo_cliente, observacoes, google_maps_url, latitude, longitude",
          )
          .in("id", clienteIds)
      : Promise.resolve({ data: [] }),
    equipeIds.length > 0
      ? supabase
          .from("equipes")
          .select("id, nome, cor_primaria, cor_secundaria")
          .in("id", equipeIds)
      : Promise.resolve({ data: [] }),
  ]);

  const clienteMap = new Map((clientes ?? []).map((c) => [c.id, c]));
  const equipeMap = new Map((equipesRows ?? []).map((e) => [e.id, e]));
  const bloqueioAtivoIds = await loadOsIdsComBloqueioAtivo(supabase, osIds);

  const merged: OrdemServicoWithRelations[] = ((ordens ?? []) as OrdemServico[]).map(
    (os) => {
      const c = clienteMap.get(os.cliente_id);
      const eqId = (os.equipe_atual_id ?? os.equipe_id) as string | null;
      const eq = eqId ? equipeMap.get(eqId) : undefined;
      const visita = visitaByOs.get(os.id) ?? null;
      return {
        ...os,
        observacoes: os.observacoes ?? null,
        anotacoes_tecnicas: (os as { anotacoes_tecnicas?: string | null }).anotacoes_tecnicas ?? null,
        cliente: c
          ? {
              id: c.id,
              nome: c.nome,
              telefone: c.telefone,
              email: c.email ?? null,
              endereco_formatado: c.endereco_formatado,
              tipo_cliente: c.tipo_cliente,
              observacoes: c.observacoes ?? null,
              google_maps_url: c.google_maps_url ?? null,
              latitude: c.latitude ?? null,
              longitude: c.longitude ?? null,
            }
          : null,
        equipe: eq
          ? {
              id: eq.id,
              nome: eq.nome,
              cor_primaria: eq.cor_primaria,
              cor_secundaria: eq.cor_secundaria,
            }
          : null,
        responsavel: null,
        visita_inicial: mapVisitaInicialResumo(visita),
        instalacao_agendada: null,
        fornecedor: null,
        eventos: [],
        tem_bloqueio_ativo: bloqueioAtivoIds.has(os.id),
      };
    },
  );

  return (
    <CampoPageFrame tab="operacao" operational>
      <OperacaoClient
        initial={merged}
        equipes={equipes}
        selectedEquipeId={equipeFilterId}
        canFilterEquipes={canFilterEquipes}
        viewerCanSeeFinancial={viewerCanSeeFinancial}
      />
    </CampoPageFrame>
  );
}
