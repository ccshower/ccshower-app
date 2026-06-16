import { UnidadesClient } from "@/app/admin/unidades/unidades-client";
import { createClient } from "@/lib/supabase/server";
import type { Unidade } from "@/lib/types/database";

export default async function UnidadesAdminPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("unidades")
    .select("id, nome, timezone, matriz, ativo, criado_em")
    .order("matriz", { ascending: false })
    .order("nome", { ascending: true });

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm font-medium text-cc-red">
          Could not load units: {error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <UnidadesClient initial={(data ?? []) as Unidade[]} />
    </main>
  );
}
