import { CampoPageFrame } from "@/components/layout/campo-page-frame";
import { FinanceiroOperacionalClient } from "@/components/financeiro/financeiro-operacional-client";
import { requireFinanceiroOperacionalPage } from "@/lib/auth/require-financeiro-operacional";
import { loadFinanceiroOperacional } from "@/lib/financeiro-operacional/load-financeiro-operacional";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  await requireFinanceiroOperacionalPage();
  const data = await loadFinanceiroOperacional();

  return (
    <CampoPageFrame tab="financeiro" operational>
      <FinanceiroOperacionalClient data={data} />
    </CampoPageFrame>
  );
}
