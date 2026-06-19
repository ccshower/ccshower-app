import {
  AGENDA_EVENTO_DATETIME_COLUMNS,
  agendaEventoStartIso,
  hasAgendaEventoStart,
} from "@/lib/ordens-servico/agenda-evento-query";
import { formatOperacionalDateTime } from "@/lib/ordens-servico/datetime";
import { createClient } from "@/lib/supabase/server";
import type { Cliente, Equipe } from "@/lib/types/database";

import type { FilaRepairItem } from "./fila-repair";
import { resolveFilaClienteNome } from "./fila-cliente-nome";

export async function loadFilaRepair(unidadeId?: string | null): Promise<{
  fila: FilaRepairItem[];
  error: string | null;
}> {
  const supabase = await createClient();

  let osQuery = supabase
    .from("ordens_servico")
    .select(
      "id, cliente_id, titulo, atualizado_em, equipe_id, equipe_atual_id, status_atual, repair_episode_id",
    )
    .eq("ativo", true)
    .eq("repair_ativo", true);

  if (unidadeId) osQuery = osQuery.eq("unidade_id", unidadeId);

  const { data: osRows, error: osError } = await osQuery.order("atualizado_em", {
    ascending: true,
  });

  if (osError) return { fila: [], error: osError.message };
  if (!osRows?.length) return { fila: [], error: null };

  const osIds = osRows.map((o) => o.id as string);
  const clienteIds = [...new Set(osRows.map((o) => o.cliente_id as string))];
  const episodeIds = osRows
    .map((o) => o.repair_episode_id as string | null)
    .filter((id): id is string => Boolean(id));

  const equipeIds = [
    ...new Set(
      osRows
        .map((o) => (o.equipe_atual_id ?? o.equipe_id) as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [
    { data: clientes, error: clientesError },
    { data: equipesRows, error: equipesError },
    { data: instRows, error: instError },
    { data: episodes, error: epError },
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
      .from("agenda_eventos")
      .select(`ordem_servico_id, is_repair, ${AGENDA_EVENTO_DATETIME_COLUMNS}`)
      .in("ordem_servico_id", osIds)
      .eq("tipo_evento", "installation")
      .eq("is_repair", true)
      .neq("status", "cancelled")
      .order("data_inicio", { ascending: true }),
    episodeIds.length
      ? supabase
          .from("os_repair_episodes")
          .select("id, valor_sugerido, os_ambiente_id")
          .in("id", episodeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const error =
    clientesError?.message ??
    equipesError?.message ??
    instError?.message ??
    epError?.message ??
    null;
  if (error) return { fila: [], error };

  const ambienteIds = [
    ...new Set(
      (episodes ?? [])
        .map((e) => e.os_ambiente_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: ambientes } =
    ambienteIds.length > 0
      ? await supabase.from("os_ambientes").select("id, nome").in("id", ambienteIds)
      : { data: [] };

  const ambMap = new Map((ambientes ?? []).map((a) => [a.id, a.nome as string]));
  const epMap = new Map((episodes ?? []).map((e) => [e.id as string, e]));
  const clienteMap = new Map(((clientes ?? []) as Cliente[]).map((c) => [c.id, c]));
  const eqMap = new Map<string, Pick<Equipe, "id" | "nome" | "cor_primaria">>();
  for (const equipe of equipesRows ?? []) {
    eqMap.set(equipe.id, equipe);
  }

  const instPorOs = new Map<string, { agendada: boolean; quando: string | null }>();
  for (const ev of instRows ?? []) {
    const osId = ev.ordem_servico_id as string;
    if (!hasAgendaEventoStart(ev)) continue;
    if (instPorOs.has(osId)) continue;
    const start = agendaEventoStartIso(ev);
    instPorOs.set(osId, {
      agendada: true,
      quando: start ? formatOperacionalDateTime(start) : null,
    });
  }

  const fila: FilaRepairItem[] = [];

  for (const os of osRows) {
    const cliente = clienteMap.get(os.cliente_id as string);
    const equipeId = (os.equipe_atual_id ?? os.equipe_id) as string | null;
    const equipe = equipeId ? eqMap.get(equipeId) : undefined;
    const osId = os.id as string;
    const inst = instPorOs.get(osId);
    const ep = os.repair_episode_id
      ? epMap.get(os.repair_episode_id as string)
      : undefined;
    const ambienteId = ep?.os_ambiente_id as string | null | undefined;

    fila.push({
      osId,
      clienteId: os.cliente_id as string,
      clienteNome: resolveFilaClienteNome(cliente?.nome, os.titulo as string | null),
      equipeId,
      equipeNome: equipe?.nome ?? null,
      equipeCorPrimaria: equipe?.cor_primaria ?? null,
      statusAtual: (os.status_atual as string) ?? "installation_scheduled",
      agendada: inst?.agendada ?? false,
      quando: inst?.quando ?? null,
      valorSugerido: ep?.valor_sugerido != null ? Number(ep.valor_sugerido) : null,
      ambienteNome: ambienteId ? ambMap.get(ambienteId) ?? null : null,
      atualizadoEm: os.atualizado_em as string,
    });
  }

  return { fila, error: null };
}
