import { createClient } from "@/lib/supabase/server";
import {
  AGENDA_EVENTO_DATETIME_COLUMNS,
  hasAgendaEventoStart,
} from "@/lib/ordens-servico/agenda-evento-query";
import { isOsNaFilaProjeto } from "@/lib/ordens-servico/fila-projeto-query";
import { resumoRetornoInstalacaoParcial } from "@/lib/ordens-servico/os-ambiente-instalacao";
import type { OsAmbiente } from "@/lib/types/database";
import { OS_ANEXO_TIPO_CNC } from "@/lib/ordens-servico/separation-list";
import type { Cliente, Equipe } from "@/lib/types/database";

import type { FilaProjetoItem } from "./fila-projeto";
import { resolveFilaClienteNome } from "./fila-cliente-nome";

export async function loadFilaProjeto(unidadeId?: string | null): Promise<{
  fila: FilaProjetoItem[];
  error: string | null;
}> {
  const supabase = await createClient();

  let osQuery = supabase
    .from("ordens_servico")
    .select(
      "id, cliente_id, titulo, criado_em, atualizado_em, equipe_id, equipe_atual_id, status_atual, etapa_atual, fornecedor_id, data_prevista_material",
    )
    .eq("ativo", true)
    .eq("etapa_atual", "project")
    .in("status_atual", ["project_pending", "project_in_progress"]);

  if (unidadeId) osQuery = osQuery.eq("unidade_id", unidadeId);

  const { data: osRows, error: osError } = await osQuery.order("atualizado_em", {
    ascending: true,
  });

  if (osError) {
    return { fila: [], error: osError.message };
  }

  const rows = (osRows ?? []).filter(isOsNaFilaProjeto);
  if (!rows.length) {
    return { fila: [], error: null };
  }

  const osIds = rows.map((o) => o.id as string);
  const clienteIds = [...new Set(rows.map((o) => o.cliente_id as string))];
  const equipeIds = [
    ...new Set(
      rows
        .map((o) => (o.equipe_atual_id ?? o.equipe_id) as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [
    { data: clientes, error: clientesError },
    { data: equipesRows, error: equipesError },
    { data: cncRows, error: cncError },
    { data: listRows, error: listError },
    { data: instRows, error: instError },
    { data: ambRows, error: ambError },
  ] = await Promise.all([
    supabase.from("clientes").select("id, nome").in("id", clienteIds).eq("ativo", true),
    equipeIds.length
      ? supabase
          .from("equipes")
          .select("id, nome, cor_primaria, cor_secundaria")
          .in("id", equipeIds)
      : Promise.resolve({
          data: [] as Pick<Equipe, "id" | "nome" | "cor_primaria" | "cor_secundaria">[],
          error: null,
        }),
    supabase
      .from("os_anexos")
      .select("ordem_servico_id")
      .in("ordem_servico_id", osIds)
      .eq("tipo", OS_ANEXO_TIPO_CNC),
    supabase
      .from("os_separation_list_items")
      .select("ordem_servico_id")
      .in("ordem_servico_id", osIds),
    supabase
      .from("agenda_eventos")
      .select(`ordem_servico_id, status, ${AGENDA_EVENTO_DATETIME_COLUMNS}`)
      .in("ordem_servico_id", osIds)
      .eq("tipo_evento", "installation")
      .neq("status", "cancelled"),
    supabase
      .from("os_ambientes")
      .select(
        "ordem_servico_id, nome, instalacao_status, instalacao_bloqueio_motivo",
      )
      .in("ordem_servico_id", osIds)
      .eq("ativo", true)
      .order("sort_order", { ascending: true }),
  ]);

  const error =
    clientesError?.message ??
    equipesError?.message ??
    cncError?.message ??
    listError?.message ??
    instError?.message ??
    ambError?.message ??
    null;

  if (error) {
    return { fila: [], error };
  }

  const clienteMap = new Map(((clientes ?? []) as Cliente[]).map((c) => [c.id, c]));
  const eqMap = new Map<string, Pick<Equipe, "id" | "nome" | "cor_primaria" | "cor_secundaria">>();
  for (const equipe of equipesRows ?? []) {
    eqMap.set(equipe.id, equipe);
  }

  const cncOsIds = new Set((cncRows ?? []).map((r) => r.ordem_servico_id as string));
  const listOsIds = new Set((listRows ?? []).map((r) => r.ordem_servico_id as string));
  const instOsIds = new Set(
    (instRows ?? [])
      .filter((ev) => hasAgendaEventoStart(ev))
      .map((ev) => ev.ordem_servico_id as string),
  );

  const ambientesPorOs = new Map<string, OsAmbiente[]>();
  for (const row of ambRows ?? []) {
    const osId = row.ordem_servico_id as string;
    const list = ambientesPorOs.get(osId) ?? [];
    list.push(row as OsAmbiente);
    ambientesPorOs.set(osId, list);
  }

  const fila: FilaProjetoItem[] = [];

  for (const os of rows) {
    const cliente = clienteMap.get(os.cliente_id as string);
    const equipeId = (os.equipe_atual_id ?? os.equipe_id) as string | null;
    const equipe = equipeId ? eqMap.get(equipeId) : undefined;
    const osId = os.id as string;
    const ambientes = ambientesPorOs.get(osId) ?? [];
    const retornoParcial = resumoRetornoInstalacaoParcial(ambientes);

    fila.push({
      osId,
      clienteId: os.cliente_id as string,
      clienteNome: resolveFilaClienteNome(cliente?.nome, os.titulo as string | null),
      equipeId,
      equipeNome: equipe?.nome ?? null,
      equipeCorPrimaria: equipe?.cor_primaria ?? null,
      statusAtual: (os.status_atual as string) ?? "project_in_progress",
      criadoEm: os.criado_em as string,
      atualizadoEm: os.atualizado_em as string,
      temFornecedor: Boolean(os.fornecedor_id),
      temDataMaterial: Boolean(os.data_prevista_material),
      temCnc: cncOsIds.has(osId),
      temListaSeparacao: listOsIds.has(osId),
      temInstalacaoAgendada: instOsIds.has(osId),
      retornoInstalacaoParcial: retornoParcial != null,
      ambientesInstalados: retornoParcial?.instalados ?? [],
      ambientesBloqueados: retornoParcial?.bloqueados ?? [],
    });
  }

  return { fila, error: null };
}
