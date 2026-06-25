"use client";

import { useState, useTransition } from "react";

import { agendarVisitaExistente } from "@/app/ordens-servico/actions";
import { AgendarVisitaForm } from "@/components/ordens-servico/agendar-visita-form";
import { t } from "@/lib/i18n";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import type { Equipe, OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
  equipes: Equipe[];
  fluxoBloqueado?: boolean;
  permitirDatasRetroativas?: boolean;
  onAgendado: () => void;
};

/** Bloco de agendamento — etapa commercial com status SEM VISITA. */
export function OsWorkspaceScheduling({
  ordem,
  equipes,
  fluxoBloqueado = false,
  permitirDatasRetroativas = false,
  onAgendado,
}: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cliente = ordem.cliente;
  if (!cliente) {
    return (
      <p className="py-6 text-center text-sm text-cc-red">
        Client not found for this work order.
      </p>
    );
  }

  const defaultEquipeId =
    ordem.equipe_atual_id ?? ordem.equipe_id ?? null;

  return (
    <div className="space-y-4">
      <p className="text-sm font-light text-cc-muted">
        {t("os.visit.schedulingSubtitle")}
      </p>

      <AgendarVisitaForm
        osId={ordem.id}
        etapa={parseOsStage(ordem.etapa_atual)}
        clienteId={cliente.id}
        clienteNome={cliente.nome}
        tipoCliente={cliente.tipo_cliente}
        equipes={equipes}
        defaultEquipeId={defaultEquipeId}
        initialEquipeId={defaultEquipeId}
        pending={pending}
        fluxoBloqueado={fluxoBloqueado}
        permitirDatasRetroativas={permitirDatasRetroativas}
        hideCancel
        onSubmit={(fd) => {
          startTransition(async () => {
            setMsg(null);
            const r = await agendarVisitaExistente(fd);
            if (!r.ok) {
              setMsg(r.message);
              return;
            }
            onAgendado();
          });
        }}
      />

      {msg ? (
        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
