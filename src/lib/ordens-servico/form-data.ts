import { createClient } from "@/lib/supabase/server";
import type { Cliente, Equipe, Usuario } from "@/lib/types/database";

export async function loadOrdemServicoFormData() {
  const supabase = await createClient();
  const [clientes, equipes, usuarios] = await Promise.all([
    supabase
      .from("clientes")
      .select(
        "id, nome, telefone, endereco_formatado, tipo_cliente, google_maps_url, latitude, longitude, equipe_id, ativo",
      )
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("equipes")
      .select(
        "id, nome, codigo_operacional, cor_primaria, cor_secundaria, ativo, criado_em, atualizado_em",
      )
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("usuarios")
      .select(
        "id, nome, telefone, email, equipe_id, tipo_usuario, pode_editar_agenda, pode_ver_todas_equipes, pode_gerenciar_estoque, pode_resolver_crash, ativo, criado_em, atualizado_em",
      )
      .eq("ativo", true)
      .order("nome", { ascending: true }),
  ]);

  return {
    clientes: (clientes.data ?? []) as Pick<
      Cliente,
      | "id"
      | "nome"
      | "telefone"
      | "endereco_formatado"
      | "tipo_cliente"
      | "google_maps_url"
      | "latitude"
      | "longitude"
      | "equipe_id"
      | "ativo"
    >[],
    equipes: (equipes.data ?? []) as Equipe[],
    usuarios: (usuarios.data ?? []) as Usuario[],
    error: clientes.error?.message ?? equipes.error?.message ?? usuarios.error?.message,
  };
}
