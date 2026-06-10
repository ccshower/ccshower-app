"use client";

import { ClienteOsListPanel } from "@/components/clientes/cliente-os-list-panel";
import { OperationalModal } from "@/components/operacional/operational-modal";
import type { ClienteOsResumo } from "@/lib/types/database";

type Props = {
  open: boolean;
  clienteNome: string;
  ordens: ClienteOsResumo[];
  onClose: () => void;
  /** Abre o painel operacional da OS existente */
  onAbrirPainel: (osId: string) => void;
  /** Abre a modal de criação (Nova Ordem de Serviço) */
  onNovaOrdem: () => void;
};

/**
 * Seletor quando o cliente tem várias OS abertas.
 * Não é operação nem criação — apenas escolha antes do painel.
 */
export function OsSelecaoModal({
  open,
  clienteNome,
  ordens,
  onClose,
  onAbrirPainel,
  onNovaOrdem,
}: Props) {
  return (
    <OperationalModal
      open={open}
      title="Select work order"
      wide
      onClose={onClose}
    >
      <ClienteOsListPanel
        clienteNome={clienteNome}
        ordens={ordens}
        onSelect={(osId) => {
          onClose();
          onAbrirPainel(osId);
        }}
        onNova={onNovaOrdem}
      />
    </OperationalModal>
  );
}
