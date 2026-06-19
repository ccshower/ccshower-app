import Link from "next/link";
import { redirect } from "next/navigation";

import { CampoPageFrame } from "@/components/layout/campo-page-frame";
import { OsWorkspacePage } from "@/components/ordens-servico/workspace/os-workspace-page";
import { getUsuarioWithEquipe } from "@/lib/auth/get-usuario-with-equipe";
import { isAdmin } from "@/lib/auth/is-admin";
import { canViewFinancialValues } from "@/lib/auth/financial-visibility";
import {
  resolveCampoNavTabForOs,
  resolveCampoProfile,
  resolveOsWorkspaceBackPath,
} from "@/lib/auth/usuario-campo";
import { loadOrdemServicoFormData } from "@/lib/ordens-servico/form-data";
import { loadOrdemServicoDetalhe } from "@/lib/ordens-servico/load-ordem-servico-detalhe";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ unidade?: string }>;
};

export default async function OsWorkspaceRoutePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { unidade } = await searchParams;
  const { usuario, equipe } = await getUsuarioWithEquipe();
  if (!usuario?.ativo) redirect("/login");

  const { data: ordem, error } = await loadOrdemServicoDetalhe(id);
  const formData = await loadOrdemServicoFormData();
  const viewerCanSeeFinancial = canViewFinancialValues(usuario, equipe);
  const profile = resolveCampoProfile(usuario, equipe);
  const campoTab = profile ? resolveCampoNavTabForOs(profile) : "operacao";
  const backHref = resolveOsWorkspaceBackPath(usuario, equipe, unidade);

  if (error || !ordem) {
    return (
      <CampoPageFrame tab={campoTab} operational>
        <div className="rounded-sm border border-cc-red-soft bg-cc-red-soft p-4 text-sm text-cc-red">
          {error ?? t("os.panel.loadError")}
        </div>
        <Link
          href={backHref}
          className="mt-4 inline-block text-xs font-medium uppercase tracking-[0.08em] text-cc-muted hover:text-cc-ink"
        >
          ← {t("os.workspace.back")}
        </Link>
      </CampoPageFrame>
    );
  }

  return (
    <CampoPageFrame tab={campoTab} operational>
      <OsWorkspacePage
        ordem={ordem}
        equipes={formData.equipes}
        viewerCanSeeFinancial={viewerCanSeeFinancial}
        isAdmin={isAdmin(usuario)}
        backHref={backHref}
      />
    </CampoPageFrame>
  );
}
