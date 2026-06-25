"use client";

import { OperationalModal } from "@/components/operacional/operational-modal";
import { AgendarVisitaForm } from "@/components/ordens-servico/agendar-visita-form";
import type { ClientType } from "@/lib/clientes/tipo-cliente";
import type { OsWorkflowStage } from "@/lib/ordens-servico/workflow";
import type { Equipe } from "@/lib/types/database";

type ClienteContatoResumo = {
  telefone: string;
  endereco_formatado: string;
};

type Props = {
  open: boolean;
  clienteId: string;
  clienteNome: string;
  tipoCliente: ClientType;
  equipes: Equipe[];
  /** Etapa operacional para filtrar equipes (padrão: comercial). */
  etapa?: OsWorkflowStage;
  defaultEquipeId: string | null;
  initialEquipeId: string | null;
  osId?: string;
  clienteContato?: ClienteContatoResumo | null;
  errorMessage?: string | null;
  pending?: boolean;
  permitirDatasRetroativas?: boolean;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
};

export function AgendarVisitaModal({
  open,
  clienteId,
  clienteNome,
  tipoCliente,
  equipes,
  etapa = "commercial",
  defaultEquipeId,
  initialEquipeId,
  osId,
  clienteContato,
  errorMessage,
  pending = false,
  permitirDatasRetroativas = false,
  onClose,
  onSubmit,
}: Props) {
  return (
    <OperationalModal open={open} title="Schedule visit" wide onClose={onClose}>
      {errorMessage ? (
        <p className="mb-3 rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm font-medium text-cc-red">
          {errorMessage}
        </p>
      ) : null}
      <AgendarVisitaForm
        clienteId={clienteId}
        clienteNome={clienteNome}
        tipoCliente={tipoCliente}
        equipes={equipes}
        etapa={etapa}
        defaultEquipeId={defaultEquipeId}
        initialEquipeId={initialEquipeId}
        osId={osId}
        clienteContato={clienteContato}
        pending={pending}
        permitirDatasRetroativas={permitirDatasRetroativas}
        onCancel={onClose}
        onSubmit={onSubmit}
      />
    </OperationalModal>
  );
}

