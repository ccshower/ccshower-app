import { redirect } from "next/navigation";

import { CampoPageFrame } from "@/components/layout/campo-page-frame";
import { getCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { loadOrdensServicoList } from "@/lib/ordens-servico/load-ordens-servico-list";
import { createClient } from "@/lib/supabase/server";

import { OrdensServicoClient } from "./ordens-servico-client";

export const dynamic = "force-dynamic";

export default async function OrdensServicoPage() {
  const { usuario } = await getCurrentUsuario();
  if (!usuario?.ativo) redirect("/login");

  const supabase = await createClient();
  const { ordens, error } = await loadOrdensServicoList(supabase);

  if (error) {
    return (
      <CampoPageFrame tab="operacao">
        <div className="rounded-sm border border-cc-red-soft bg-cc-red-soft p-4 text-sm text-cc-red">
          Error loading: {error}
          {error.includes("ordens_servico") ? (
            <span className="mt-2 block text-cc-deep">
              Run migration{" "}
              <code className="text-xs">20250520000000_ordens_servico_agenda.sql</code> in
              Supabase.
            </span>
          ) : null}
        </div>
      </CampoPageFrame>
    );
  }

  return (
    <CampoPageFrame tab="operacao">
      <OrdensServicoClient initial={ordens} />
    </CampoPageFrame>
  );
}
