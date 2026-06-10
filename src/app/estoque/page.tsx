import { listarCatalogoItens } from "@/app/ordens-servico/projeto-actions";
import { CampoPageFrame } from "@/components/layout/campo-page-frame";
import { CatalogoEstoqueList } from "@/components/projeto/catalogo-estoque-list";
import { requireCampoProjetoPage } from "@/lib/auth/require-campo-projeto";

export const dynamic = "force-dynamic";

export default async function EstoquePage() {
  await requireCampoProjetoPage();
  const { itens, error } = await listarCatalogoItens();

  return (
    <CampoPageFrame tab="estoque">
      {error ? (
        <div className="rounded-sm border border-cc-red-soft bg-cc-red-soft p-4 text-sm text-cc-red">
          Error loading inventory: {error}
        </div>
      ) : (
        <CatalogoEstoqueList itens={itens} />
      )}
    </CampoPageFrame>
  );
}
