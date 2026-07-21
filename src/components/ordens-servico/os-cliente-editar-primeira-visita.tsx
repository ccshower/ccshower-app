"use client";

import { useState, useTransition } from "react";

import { atualizarClientePrimeiraVisita } from "@/app/ordens-servico/visita-comercial-actions";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { OperationalModal } from "@/components/operacional/operational-modal";
import { isClienteEditavelPrimeiraVisita } from "@/lib/ordens-servico/visita-comercial";
import type { ClienteWithRelations, OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
  googleMapsApiKey: string;
  onSaved: () => void;
};

/** Botão + modal de edição completa do cliente — visível só antes de a visita ser agendada. */
export function OsClienteEditarPrimeiraVisita({
  ordem,
  googleMapsApiKey,
  onSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cliente = ordem.cliente;
  if (!cliente || !isClienteEditavelPrimeiraVisita(ordem)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMsg(null);
          setOpen(true);
        }}
        className="rounded-sm border border-cc-border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
      >
        Edit customer
      </button>

      <OperationalModal
        open={open}
        title="Edit customer"
        onClose={() => setOpen(false)}
      >
        <ClienteForm
          key={`${cliente.id}-${open}`}
          formKey={`${cliente.id}-${open}`}
          cliente={cliente as unknown as ClienteWithRelations}
          contractors={[]}
          apiKey={googleMapsApiKey}
          pending={pending}
          mode="primeira_visita"
          onCancel={() => setOpen(false)}
          onSubmit={(fd) => {
            startTransition(async () => {
              setMsg(null);
              const r = await atualizarClientePrimeiraVisita(ordem.id, fd);
              if (!r.ok) {
                setMsg(r.message);
                return;
              }
              setOpen(false);
              onSaved();
            });
          }}
        />
        {msg ? (
          <p className="mt-3 rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
            {msg}
          </p>
        ) : null}
      </OperationalModal>
    </>
  );
}
