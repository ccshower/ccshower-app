import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import {
  AGENDA_EVENTO_VISITA_OS_SELECT,
  compareAgendaEventoStartAsc,
  mapVisitaInicialResumo,
} from "@/lib/ordens-servico/agenda-evento-query";
import { getCurrentUsuario, isAdmin } from "@/lib/auth/get-current-usuario";
import { loadOrdemServicoFormData } from "@/lib/ordens-servico/form-data";
import { loadOsIdsComBloqueioAtivo } from "@/lib/ordens-servico/load-os-bloqueio-ativo-ids";
import { createClient } from "@/lib/supabase/server";
import type { OrdemServico, OrdemServicoWithRelations } from "@/lib/types/database";

import { OrdensServicoClient } from "./ordens-servico-client";

export const dynamic = "force-dynamic";

export default async function OrdensServicoPage() {
  const { usuario } = await getCurrentUsuario();
  if (!usuario?.ativo) redirect("/login");

  const supabase = await createClient();
  const { data: ordens, error: eOs } = await supabase
    .from("ordens_servico")
    .select("*")
    .order("criado_em", { ascending: false });

  const formData = await loadOrdemServicoFormData();

  if (eOs || formData.error) {
    return (
      <AppShell>
        <div className="rounded-sm border border-cc-red-soft bg-cc-red-soft p-4 text-sm text-cc-red">
          Error loading: {eOs?.message ?? formData.error}
          {eOs?.message?.includes("ordens_servico") ? (
            <span className="mt-2 block text-cc-deep">
              Run migration{" "}
              <code className="text-xs">20250520000000_ordens_servico_agenda.sql</code> in
              Supabase.
            </span>
          ) : null}
        </div>
      </AppShell>
    );
  }

  const clientes = formData.clientes;
  const equipes = formData.equipes;
  const usuarios = formData.usuarios;

  const clienteMap = new Map(clientes.map((c) => [c.id, c]));
  const equipeMap = new Map(equipes.map((e) => [e.id, e]));

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
  const userMap = new Map(usuarios.map((u) => [u.id, u]));

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
              tipo_cliente: c.tipo_cliente,
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

  return (
    <AppShell>
      <OrdensServicoClient initial={merged} />
    </AppShell>
  );
}
