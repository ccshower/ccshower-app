import { EquipesClient } from "./equipes-client";
import { requireAdminOnlyPage } from "@/lib/auth/require-admin-only";
import { loadUnidades } from "@/lib/unidades/load-unidades";
import { createClient } from "@/lib/supabase/server";
import type { Equipe, Usuario } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function AdminEquipesPage() {
  await requireAdminOnlyPage();
  const supabase = await createClient();
  const [{ data, error }, { data: usuarios, error: usuariosError }, { unidades, error: unidadesError }] =
    await Promise.all([
      supabase.from("equipes").select("*").order("nome", { ascending: true }),
      supabase.from("usuarios").select("nome, equipe_id, ativo").order("nome", { ascending: true }),
      loadUnidades(),
    ]);

  if (error || unidadesError || usuariosError) {
    const message =
      error?.message ?? unidadesError ?? usuariosError?.message ?? "Unknown error";
    return (
      <div className="rounded-sm border border-cc-red-soft bg-cc-red-soft p-4 text-sm font-medium text-cc-red">
        Error loading teams: {message}
      </div>
    );
  }

  return (
    <EquipesClient
      initial={(data ?? []) as Equipe[]}
      unidades={unidades}
      usuarios={(usuarios ?? []) as Pick<Usuario, "nome" | "equipe_id" | "ativo">[]}
    />
  );
}

