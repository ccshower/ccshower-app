"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { OsForm } from "@/components/ordens-servico/os-form";
import type { Cliente, Equipe, Usuario } from "@/lib/types/database";

import { criarOrdemServicoComVisita } from "../actions";

type ClienteOption = Pick<
  Cliente,
  "id" | "nome" | "telefone" | "endereco_formatado" | "equipe_id" | "ativo"
>;

export function NovaOrdemServicoForm({
  clientes,
  equipes,
  usuarios,
  defaultEquipeId,
}: {
  clientes: ClienteOption[];
  equipes: Equipe[];
  usuarios: Usuario[];
  defaultEquipeId: string | null;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      {msg ? (
        <p className="mb-4 rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
          {msg}
        </p>
      ) : null}
      <OsForm
        clientes={clientes}
        equipes={equipes}
        usuarios={usuarios}
        defaultEquipeId={defaultEquipeId}
        pending={pending}
        submitLabel="Create work order"
        onSubmit={(fd) => {
          startTransition(async () => {
            const r = await criarOrdemServicoComVisita(fd);
            if (!r.ok) {
              setMsg(r.message);
              return;
            }
            router.push("/ordens-servico");
            router.refresh();
          });
        }}
      />
    </>
  );
}
