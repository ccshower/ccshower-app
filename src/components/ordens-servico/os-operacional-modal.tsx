/**
 * @deprecated Substituído pela página /os/[id] (OsWorkspace).
 * Não usar para operação de OS existente.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

import { OsOperacionalSheet } from "@/components/ordens-servico/os-operacional-sheet";
import { OsPainelOperacional } from "@/components/ordens-servico/os-painel-operacional";
import { buscarDetalheOrdemServico } from "@/app/ordens-servico/actions";
import { OsOperacionalBadge } from "@/components/ordens-servico/os-operacional-badge";
import { t } from "@/lib/i18n";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  osId: string | null;
  onClose: () => void;
  onAtualizado?: () => void;
};

export function OsOperacionalModal({ osId, onClose, onAtualizado }: Props) {
  const [ordem, setOrdem] = useState<OrdemServicoWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (id: string) => {
    setLoading(true);
    setErro(null);
    setOrdem(null);

    const { data, error } = await buscarDetalheOrdemServico(id);
    setLoading(false);

    if (error || !data) {
      setErro(error ?? t("os.panel.loadError"));
      return;
    }
    setOrdem(data);
  }, []);

  useEffect(() => {
    if (!osId) {
      setOrdem(null);
      setLoading(false);
      setErro(null);
      return;
    }
    void carregar(osId);
  }, [osId, carregar]);

  const open = Boolean(osId);
  const ariaLabel = ordem?.cliente?.nome
    ? `${t("os.panel.operacaoTitle")} — ${ordem.cliente.nome}`
    : t("os.panel.operacaoTitle");

  function handleAtualizado() {
    if (osId) void carregar(osId);
    onAtualizado?.();
  }

  return (
    <OsOperacionalSheet open={open} onClose={onClose} ariaLabel={ariaLabel}>
      {loading ? (
        <p className="py-8 text-center text-sm text-cc-muted">{t("os.panel.loading")}</p>
      ) : null}
      {erro && !ordem && !loading ? (
        <p className="text-sm text-cc-red">{erro}</p>
      ) : null}
      {ordem && !loading ? (
        <OsPainelOperacional ordem={ordem} onAtualizado={handleAtualizado} />
      ) : null}
    </OsOperacionalSheet>
  );
}
