"use client";

import type { ReactNode } from "react";

import { OsOperacionalSheet } from "@/components/ordens-servico/os-operacional-sheet";
import { formatWorkspaceDateTime } from "@/components/ordens-servico/workspace/os-workspace-utils";
import { t, tClientType, tOsStage, tOsStatus } from "@/lib/i18n";
import {
  labelOperationalStatus,
  parseOsStage,
} from "@/lib/ordens-servico/operacional-snapshot";
import { formatResponsavelAuxiliar } from "@/lib/ordens-servico/responsavel-equipe";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
  open: boolean;
  onClose: () => void;
};

function DetalheLinha({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-cc-border/40 py-2.5 last:border-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-subtle">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-light text-cc-ink">{children}</dd>
    </div>
  );
}

/** Ficha completa — fora da tela principal de execução. */
export function OsWorkspaceDetalhesSheet({ ordem, open, onClose }: Props) {
  const cliente = ordem.cliente;
  const titulo = cliente?.nome
    ? `${t("os.workspace.detailsTitle")} — ${cliente.nome}`
    : t("os.workspace.detailsTitle");

  return (
    <OsOperacionalSheet open={open} onClose={onClose} ariaLabel={titulo}>
      <div className="space-y-4">
        <header>
          <h2 className="font-display text-lg font-light text-cc-ink">{titulo}</h2>
          <p className="mt-1 text-xs text-cc-muted">
            {t("os.panel.summaryTitle")} — administrative details
          </p>
        </header>

        <section>
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted">
            {t("os.workspace.clientSection")}
          </h3>
          <dl className="rounded-ds-lg border border-cc-border bg-white px-3">
            <DetalheLinha label={t("os.workspace.phone")}>
              {cliente?.telefone ? (
                <a
                  href={`tel:${cliente.telefone.replace(/\D/g, "")}`}
                  className="text-cc-blue-focus hover:underline"
                >
                  {cliente.telefone}
                </a>
              ) : (
                "—"
              )}
            </DetalheLinha>
            <DetalheLinha label={t("os.workspace.email")}>
              {cliente?.email ? (
                <a
                  href={`mailto:${cliente.email}`}
                  className="break-all text-cc-blue-focus hover:underline"
                >
                  {cliente.email}
                </a>
              ) : (
                "—"
              )}
            </DetalheLinha>
            <DetalheLinha label={t("os.workspace.fullAddress")}>
              <span className="leading-snug text-cc-deep">
                {cliente?.endereco_formatado ?? "—"}
              </span>
            </DetalheLinha>
            <DetalheLinha label={t("os.workspace.clientType")}>
              {cliente?.tipo_cliente
                ? tClientType(cliente.tipo_cliente)
                : "—"}
            </DetalheLinha>
            <DetalheLinha label={t("os.workspace.clientNotes")}>
              <span className="whitespace-pre-wrap text-cc-deep">
                {cliente?.observacoes?.trim() || "—"}
              </span>
            </DetalheLinha>
          </dl>
        </section>

        <section>
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted">
            {t("os.workspace.osSection")}
          </h3>
          <dl className="rounded-ds-lg border border-cc-border bg-white px-3">
            <DetalheLinha label={t("os.workspace.osTitle")}>
              {ordem.titulo}
            </DetalheLinha>
            <DetalheLinha label={t("os.workspace.stage")}>
              {tOsStage(parseOsStage(ordem.etapa_atual))}
            </DetalheLinha>
            <DetalheLinha label={t("os.timeline.status")}>
              {labelOperationalStatus(ordem.status_atual)}
              <span className="text-cc-subtle">
                {" "}
                · {tOsStatus(ordem.status)}
              </span>
            </DetalheLinha>
            <DetalheLinha label={t("os.workspace.team")}>
              {ordem.equipe?.nome ?? "—"}
            </DetalheLinha>
            <DetalheLinha label={t("os.timeline.responsible")}>
              {formatResponsavelAuxiliar(ordem.responsavel?.nome)}
            </DetalheLinha>
            <DetalheLinha label={t("os.workspace.osDescription")}>
              <span className="whitespace-pre-wrap text-cc-deep">
                {ordem.descricao?.trim() || "—"}
              </span>
            </DetalheLinha>
            <DetalheLinha label={t("os.workspace.osNotes")}>
              <span className="whitespace-pre-wrap text-cc-deep">
                {ordem.observacoes?.trim() || "—"}
              </span>
            </DetalheLinha>
            <DetalheLinha label={t("os.workspace.createdAt")}>
              {formatWorkspaceDateTime(ordem.criado_em)}
            </DetalheLinha>
          </dl>
        </section>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-sm border border-cc-border py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted hover:bg-cc-border-light"
        >
          {t("os.panel.close")}
        </button>
      </div>
    </OsOperacionalSheet>
  );
}
