import type { Metadata } from "next";

import { cookies } from "next/headers";

import { CentroOperacionalClient } from "@/components/admin/centro-operacional/centro-operacional-client";
import { getCurrentUsuario, isAdmin, isAdminOrManager } from "@/lib/auth/get-current-usuario";
import { loadAgendaGlobal } from "@/lib/centro-operacional/load-agenda-global";
import { loadAtencaoAgora } from "@/lib/centro-operacional/load-atencao-agora";
import { loadBloqueiosOperacionais } from "@/lib/centro-operacional/load-bloqueios-operacionais";
import { loadCapacidadeOperacional } from "@/lib/centro-operacional/load-capacidade-operacional";
import { loadFilaComercial } from "@/lib/centro-operacional/load-fila-comercial";
import { loadFilaProjeto } from "@/lib/centro-operacional/load-fila-projeto";
import { loadGargalosOperacionais } from "@/lib/centro-operacional/load-gargalos-operacionais";
import { loadProducaoMensal } from "@/lib/centro-operacional/load-producao-mensal";
import { loadSaudeOperacional } from "@/lib/centro-operacional/load-saude-operacional";
import { pickDefaultCommercialEquipeId } from "@/lib/ordens-servico/workflow-equipe";
import { loadUnidades } from "@/lib/unidades/load-unidades";
import {
  CENTRO_UNIDADE_COOKIE,
  resolveCentroUnidadeId,
} from "@/lib/unidades/centro-unidade-persist";
import { createClient } from "@/lib/supabase/server";
import type { Equipe, Unidade, Usuario } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operational Center — CCSHOWER",
  description: "Operational command center. Blocks, pending items, schedule, and flow health.",
};

/**
 * Admin escolhe a unidade via ?unidade=<id> ou cookie (sem parâmetro = todas).
 * Não-admin fica travado na própria unidade.
 */
export default async function CentroOperacionalPage({
  searchParams,
}: {
  searchParams: Promise<{ unidade?: string }>;
}) {
  const [{ usuario }, params, { unidades }, cookieStore] = await Promise.all([
    getCurrentUsuario(),
    searchParams,
    loadUnidades(),
    cookies(),
  ]);
  const supabase = await createClient();

  const unidadeId = resolveCentroUnidadeId(
    usuario,
    unidades,
    params.unidade,
    cookieStore.get(CENTRO_UNIDADE_COOKIE)?.value,
  );

  const [
    { fila: filaComercial, error: filaComercialError },
    { fila: filaProjeto, error: filaProjetoError },
    agendaGlobal,
    saudeOperacional,
    atencaoAgora,
    bloqueiosOperacionais,
    producaoMensal,
    gargalosOperacionais,
    capacidadeOperacional,
    { data: equipes, error: equipesError },
    { data: usuarios, error: usuariosError },
  ] = await Promise.all([
    loadFilaComercial(unidadeId),
    loadFilaProjeto(unidadeId),
    loadAgendaGlobal(unidadeId),
    loadSaudeOperacional(unidadeId),
    loadAtencaoAgora(unidadeId),
    loadBloqueiosOperacionais(unidadeId),
    loadProducaoMensal(unidadeId),
    loadGargalosOperacionais(unidadeId),
    loadCapacidadeOperacional(unidadeId),
    supabase
      .from("equipes")
      .select(
        "id, nome, codigo_operacional, cor_primaria, cor_secundaria, ativo, criado_em, atualizado_em",
      )
      .order("nome", { ascending: true }),
    supabase
      .from("usuarios")
      .select(
        "id, nome, telefone, email, equipe_id, tipo_usuario, pode_editar_agenda, pode_ver_todas_equipes, pode_gerenciar_estoque, pode_resolver_crash, ativo, criado_em, atualizado_em",
      )
      .eq("ativo", true)
      .order("nome", { ascending: true }),
  ]);

  const eqList = (equipes ?? []) as Equipe[];

  return (
    <CentroOperacionalClient
      filaComercial={filaComercial}
      filaComercialError={filaComercialError ?? equipesError?.message ?? usuariosError?.message ?? null}
      filaProjeto={filaProjeto}
      filaProjetoError={filaProjetoError}
      agendaGlobal={agendaGlobal}
      saudeOperacional={saudeOperacional}
      atencaoAgora={atencaoAgora}
      bloqueiosOperacionais={bloqueiosOperacionais}
      producaoMensal={producaoMensal}
      gargalosOperacionais={gargalosOperacionais}
      capacidadeOperacional={capacidadeOperacional}
      equipes={eqList}
      usuarios={(usuarios ?? []) as Usuario[]}
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
      defaultEquipeId={pickDefaultCommercialEquipeId(eqList, usuario?.equipe_id)}
      canChooseEquipe={isAdminOrManager(usuario) || Boolean(usuario?.pode_ver_todas_equipes)}
      viewerNome={usuario?.nome?.trim() || "User"}
      isAdmin={isAdmin(usuario)}
      canSelectUnidade={isAdminOrManager(usuario)}
      unidades={unidades}
      unidadeSelecionadaId={unidadeId}
    />
  );
}
