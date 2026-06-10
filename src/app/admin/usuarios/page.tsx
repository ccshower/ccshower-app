import type { Equipe, Unidade, Usuario, UsuarioWithEquipe } from "@/lib/types/database";
import { requireAdminOnlyPage } from "@/lib/auth/require-admin-only";
import { loadUnidades } from "@/lib/unidades/load-unidades";
import { createClient } from "@/lib/supabase/server";

import { UsuariosClient } from "./usuarios-client";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  await requireAdminOnlyPage();
  const supabase = await createClient();
  const [{ data: equipes, error: e1 }, { data: usuarios, error: e2 }, { unidades, error: e3 }] =
    await Promise.all([
      supabase
        .from("equipes")
        .select("id, nome, cor_primaria, cor_secundaria, ativo, criado_em, atualizado_em")
        .order("nome", { ascending: true }),
      supabase.from("usuarios").select("*").order("nome", { ascending: true }),
      loadUnidades(),
    ]);

  if (e1 || e2 || e3) {
    return (
      <div className="rounded-sm border border-cc-red-soft bg-cc-red-soft p-4 text-sm font-medium text-cc-red">
        Error loading data: {e1?.message ?? e2?.message ?? e3}
      </div>
    );
  }

  const eqList = (equipes ?? []) as Equipe[];
  const mapEq = new Map(eqList.map((e) => [e.id, e]));
  const mapUn = new Map<string, Unidade>(unidades.map((u) => [u.id, u]));
  const merged: UsuarioWithEquipe[] = (usuarios ?? []).map((u) => {
    const row = u as Usuario;
    const eq = row.equipe_id ? mapEq.get(row.equipe_id) : undefined;
    const un = row.unidade_id ? mapUn.get(row.unidade_id) : undefined;
    return {
      ...row,
      equipe: eq
        ? {
            id: eq.id,
            nome: eq.nome,
            cor_primaria: eq.cor_primaria,
            cor_secundaria: eq.cor_secundaria,
          }
        : null,
      unidade: un ? { id: un.id, nome: un.nome, matriz: un.matriz } : null,
    };
  });

  return <UsuariosClient initial={merged} equipes={eqList} unidades={unidades} />;
}
