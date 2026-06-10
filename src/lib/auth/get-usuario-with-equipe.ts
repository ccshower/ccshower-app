import { getCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { createClient } from "@/lib/supabase/server";
import type { Equipe, Unidade, Usuario } from "@/lib/types/database";

import type { UsuarioEquipeContext } from "./usuario-comercial";

export async function getUsuarioWithEquipe(): Promise<{
  usuario: Usuario | null;
  equipe: UsuarioEquipeContext | null;
  unidade: Pick<Unidade, "id" | "nome"> | null;
  authId: string | null;
}> {
  const { usuario, authId } = await getCurrentUsuario();
  if (!usuario) {
    return { usuario: null, equipe: null, unidade: null, authId };
  }

  const supabase = await createClient();
  const [equipeRes, unidadeRes] = await Promise.all([
    usuario.equipe_id
      ? supabase
          .from("equipes")
          .select("id, nome, codigo_operacional, cor_primaria, ativo")
          .eq("id", usuario.equipe_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    usuario.unidade_id
      ? supabase
          .from("unidades")
          .select("id, nome")
          .eq("id", usuario.unidade_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    usuario,
    equipe: (equipeRes.data as UsuarioEquipeContext | null) ?? null,
    unidade: (unidadeRes.data as Pick<Unidade, "id" | "nome"> | null) ?? null,
    authId,
  };
}
