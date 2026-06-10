"use client";

import { OsOperacionalForm } from "@/components/ordens-servico/os-operacional-form";
import type { ClientType } from "@/lib/clientes/tipo-cliente";
import type { Equipe, Usuario } from "@/lib/types/database";

type Props = {
  clienteId: string;
  clienteNome?: string;
  tipoCliente?: ClientType | null;
  equipes: Equipe[];
  usuarios: Usuario[];
  defaultEquipeId: string | null;
  initialEquipeId?: string | null;
  pending?: boolean;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
};

export function OsVisitaInicialForm(props: Props) {
  return (
    <OsOperacionalForm
      mode="create"
      clienteId={props.clienteId}
      clienteNome={props.clienteNome}
      tipoCliente={props.tipoCliente}
      equipes={props.equipes}
      usuarios={props.usuarios}
      defaultEquipeId={props.defaultEquipeId}
      initialEquipeId={props.initialEquipeId}
      pending={props.pending}
      submitLabel={props.submitLabel}
      onCancel={props.onCancel}
      onSubmit={props.onSubmit}
    />
  );
}
