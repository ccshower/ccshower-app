import { listarFornecedores } from "@/app/ordens-servico/projeto-actions";
import { CampoPageFrame } from "@/components/layout/campo-page-frame";
import { FornecedorList } from "@/components/projeto/fornecedor-list";
import { requireCampoProjetoPage } from "@/lib/auth/require-campo-projeto";

export const dynamic = "force-dynamic";

export default async function FornecedorPage() {
  await requireCampoProjetoPage();
  const { itens, error } = await listarFornecedores();

  return (
    <CampoPageFrame tab="fornecedor">
      {error ? (
        <div className="rounded-sm border border-cc-red-soft bg-cc-red-soft p-4 text-sm text-cc-red">
          Error loading suppliers: {error}
        </div>
      ) : (
        <FornecedorList itens={itens} />
      )}
    </CampoPageFrame>
  );
}
