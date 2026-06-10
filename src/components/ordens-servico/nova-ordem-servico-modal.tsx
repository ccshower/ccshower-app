"use client";

import { OperationalModal } from "@/components/operacional/operational-modal";
import { OsVisitaInicialForm } from "@/components/ordens-servico/os-visita-inicial-form";
import type { ClientType } from "@/lib/clientes/tipo-cliente";
import type { Equipe, Usuario } from "@/lib/types/database";

type Props = {
  open: boolean;
  clienteId: string;
  clienteNome: string;
  tipoCliente: ClientType;
  equipes: Equipe[];
  usuarios: Usuario[];
  defaultEquipeId: string | null;
  initialEquipeId: string | null;
  pending?: boolean;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
};

/**
 * Abertura de OS — criar + agendar visita.
 * Não usar para operar OS existente (use a página /os/[id]).
 */
export function NovaOrdemServicoModal({
  open,
  clienteId,
  clienteNome,
  tipoCliente,
  equipes,
  usuarios,
  defaultEquipeId,
  initialEquipeId,
  pending = false,
  onClose,
  onSubmit,
}: Props) {
  return (
    <OperationalModal
      open={open}
      title="Schedule visit"
      wide
      onClose={onClose}
    >
      <OsVisitaInicialForm
        key={`${clienteId}-${tipoCliente}-${open}`}
        clienteId={clienteId}
        clienteNome={clienteNome}
        tipoCliente={tipoCliente}
        equipes={equipes}
        usuarios={usuarios}
        defaultEquipeId={defaultEquipeId}
        initialEquipeId={initialEquipeId}
        pending={pending}
        submitLabel="Schedule visit"
        onCancel={onClose}
        onSubmit={onSubmit}
      />
    </OperationalModal>
  );
}
