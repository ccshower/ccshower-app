import { getCurrentUsuario, isAdmin } from "@/lib/auth/get-current-usuario";
import { loadContractorsAtivos } from "@/lib/clientes/load-contractors";
import { loadOsPorCliente } from "@/lib/ordens-servico/load-os-por-cliente";
import { pickDefaultCommercialEquipeId } from "@/lib/ordens-servico/workflow-equipe";
import { createClient } from "@/lib/supabase/server";
import type {
  Cliente,
  ClienteWithRelations,
  Equipe,
  Usuario,
} from "@/lib/types/database";

import { ClientesClient } from "./clientes-client";

export const dynamic = "force-dynamic";

export default async function AdminClientesPage() {
  const { usuario } = await getCurrentUsuario();
  const supabase = await createClient();
  const [
    { data: clientes, error: e1 },
    { data: equipes, error: e2 },
    { data: usuarios, error: e3 },
    { osPorCliente, error: e4 },
    { contractors, error: e5 },
  ] = await Promise.all([
      supabase.from("clientes").select("*").order("criado_em", { ascending: false }),
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
    loadOsPorCliente(),
    loadContractorsAtivos(supabase),
  ]);

  if (e1 || e2 || e3 || e5) {
    return (
      <div className="rounded-sm border border-cc-red-soft bg-cc-red-soft p-4 text-sm font-medium text-cc-red">
        Error loading customers:{" "}
        {e1?.message ?? e2?.message ?? e3?.message ?? e5}
      </div>
    );
  }

  const eqList = (equipes ?? []) as Equipe[];
  const userList = (usuarios ?? []) as Usuario[];
  const eqMap = new Map(eqList.map((e) => [e.id, e]));

  const merged: ClienteWithRelations[] = ((clientes ?? []) as Cliente[]).map((c) => {
    const equipe = c.equipe_id ? eqMap.get(c.equipe_id) : undefined;

    return {
      ...c,
      equipe: equipe
        ? {
            id: equipe.id,
            nome: equipe.nome,
            cor_primaria: equipe.cor_primaria,
            cor_secundaria: equipe.cor_secundaria,
          }
        : null,
    };
  });

  return (
    <ClientesClient
      initial={merged}
      equipes={eqList}
      usuarios={userList}
      contractors={contractors}
      initialOsPorCliente={osPorCliente}
      osLoadWarning={e4}
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
      defaultEquipeId={pickDefaultCommercialEquipeId(eqList, usuario?.equipe_id)}
      canChooseEquipe={
        isAdmin(usuario) || Boolean(usuario?.pode_ver_todas_equipes)
      }
      permitirDatasRetroativas={isAdmin(usuario)}
    />
  );
}
