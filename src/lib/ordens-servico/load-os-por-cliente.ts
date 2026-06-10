import { createClient } from "@/lib/supabase/server";
import type { ClienteOsResumo, Equipe } from "@/lib/types/database";

import { buildOsPorCliente } from "./cliente-os-map";

export async function loadOsPorCliente(): Promise<{
  osPorCliente: Record<string, ClienteOsResumo[]>;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: ordens, error: osErr } = await supabase
    .from("ordens_servico")
    .select(
      "id, cliente_id, titulo, status, atualizado_em, equipe_id, equipe_atual_id, etapa_atual, status_atual",
    )
    .eq("ativo", true)
    .order("atualizado_em", { ascending: false });

  if (osErr) {
    return { osPorCliente: {}, error: osErr.message };
  }

  const lista = ordens ?? [];
  const equipeIds = [
    ...new Set(
      lista
        .flatMap((o) => [o.equipe_atual_id, o.equipe_id])
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const eqMap = new Map<
    string,
    Pick<Equipe, "id" | "nome" | "cor_primaria">
  >();

  if (equipeIds.length > 0) {
    const { data: equipes, error: eqErr } = await supabase
      .from("equipes")
      .select("id, nome, cor_primaria")
      .in("id", equipeIds);

    if (eqErr) {
      return { osPorCliente: {}, error: eqErr.message };
    }

    for (const e of equipes ?? []) {
      eqMap.set(e.id, {
        id: e.id,
        nome: e.nome,
        cor_primaria: e.cor_primaria,
      });
    }
  }

  const rows = lista.map((o) => {
    const atualId = (o.equipe_atual_id ?? o.equipe_id) as string | null;
    const legacyId = o.equipe_id as string | null;
    return {
      id: o.id as string,
      cliente_id: o.cliente_id as string,
      titulo: o.titulo as string,
      status: o.status as ClienteOsResumo["status"],
      atualizado_em: o.atualizado_em as string,
      etapa_atual: (o.etapa_atual as string) ?? "commercial",
      status_atual: (o.status_atual as string) ?? "commercial_pending",
      equipe_atual: atualId ? eqMap.get(atualId) ?? null : null,
      equipe_legacy: legacyId ? eqMap.get(legacyId) ?? null : null,
    };
  });

  return { osPorCliente: buildOsPorCliente(rows) };
}
