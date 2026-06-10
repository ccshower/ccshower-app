import { CampoPageFrame } from "@/components/layout/campo-page-frame";
import { CatalogoInsumoForm } from "@/components/projeto/catalogo-insumo-form";
import { requireCampoProjetoPage } from "@/lib/auth/require-campo-projeto";

export const dynamic = "force-dynamic";

export default async function EstoqueNovoPage() {
  await requireCampoProjetoPage();

  return (
    <CampoPageFrame tab="estoque">
      <CatalogoInsumoForm />
    </CampoPageFrame>
  );
}
