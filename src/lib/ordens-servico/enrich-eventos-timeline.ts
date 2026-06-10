import type { SupabaseClient } from "@supabase/supabase-js";

import type { AgendaEvento, AgendaEventoTimeline, Equipe, Usuario } from "@/lib/types/database";

export async function enrichEventosTimeline(
  supabase: SupabaseClient,
  eventos: AgendaEvento[],
): Promise<AgendaEventoTimeline[]> {
  if (eventos.length === 0) return [];

  const equipeIds = [
    ...new Set(
      eventos.map((e) => e.equipe_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  const userIds = [
    ...new Set(
      eventos
        .map((e) => e.responsavel_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [eqRes, userRes] = await Promise.all([
    equipeIds.length > 0
      ? supabase
          .from("equipes")
          .select("id, nome, cor_primaria, codigo_operacional, ativo")
          .in("id", equipeIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? supabase.from("usuarios").select("id, nome").in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const eqMap = new Map(
    ((eqRes.data ?? []) as EquipeTimeline[]).map((e) => [e.id, e]),
  );
  const userMap = new Map(
    ((userRes.data ?? []) as Pick<Usuario, "id" | "nome">[]).map((u) => [
      u.id,
      u,
    ]),
  );

  return eventos.map((ev) => ({
    ...ev,
    equipe: ev.equipe_id ? (eqMap.get(ev.equipe_id) ?? null) : null,
    responsavel: ev.responsavel_id
      ? (userMap.get(ev.responsavel_id) ?? null)
      : null,
  }));
}

export type EquipeTimeline = Pick<
  Equipe,
  "id" | "nome" | "cor_primaria" | "codigo_operacional" | "ativo"
>;
