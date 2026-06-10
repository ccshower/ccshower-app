"use client";

import { type CSSProperties, type ReactNode } from "react";

import {
  OsBloqueioListBadge,
  osTemBloqueioAtivoListagem,
} from "@/components/ordens-servico/os-bloqueio-list-badge";
import { OsOperacionalBadge } from "@/components/ordens-servico/os-operacional-badge";
import { OsSemEquipeBadge } from "@/components/ordens-servico/os-sem-equipe-badge";
import { osSemEquipe } from "@/lib/equipes/validate-equipe-operacional";
import { t } from "@/lib/i18n";
import {
  formatOperacionalVisita,
  formatOperacionalVisitaCard,
} from "@/lib/ordens-servico/datetime";
import {
  labelOperationalStatus,
  parseOsStage,
} from "@/lib/ordens-servico/operacional-snapshot";
import { tituloOperacionalCard } from "@/lib/ordens-servico/os-operational-title";
import {
  buildFinancialWorkspaceSummary,
  financialDecisionUi,
  formatMoneyUsd,
  parseFinancialDecision,
} from "@/lib/ordens-servico/financial-workspace";
import {
  formatVisitPaymentCardLine,
  hasVisitPaymentCapture,
} from "@/lib/ordens-servico/visit-payment";
import {
  EQUIPE_CARD_TINT_ALPHA,
  equipeCardSurfaceStyles,
} from "@/lib/ui/equipe-color";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  os: OrdemServicoWithRelations;
  onOpen: () => void;
  viewerCanSeeFinancial?: boolean;
  /** Fundo e borda por equipe (tela Operação / mesma lógica do calendário). */
  coloredByEquipe?: boolean;
};

const cardClassNeutral =
  "w-full rounded-ds-lg border border-cc-border bg-cc-surface p-4 text-left shadow-sheet transition hover:border-cc-blue-soft hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-cc-blue-focus";

const cardClassEquipe =
  "w-full rounded-ds-lg border border-cc-border/70 p-4 text-left shadow-sheet transition hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-cc-blue-focus";

function operationalCardSurface(
  os: OrdemServicoWithRelations,
  coloredByEquipe: boolean,
  semEquipe: boolean,
): CSSProperties | undefined {
  if (!coloredByEquipe || semEquipe || !os.equipe) return undefined;
  return equipeCardSurfaceStyles(
    os.equipe.cor_primaria,
    os.equipe.cor_secundaria,
    EQUIPE_CARD_TINT_ALPHA,
  );
}

function OperationalCardShell({
  os,
  semEquipe,
  coloredByEquipe,
  onOpen,
  children,
}: {
  os: OrdemServicoWithRelations;
  semEquipe: boolean;
  coloredByEquipe: boolean;
  onOpen: () => void;
  children: ReactNode;
}) {
  const surface = operationalCardSurface(os, coloredByEquipe, semEquipe);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={surface ? cardClassEquipe : cardClassNeutral}
      style={surface}
    >
      {children}
    </button>
  );
}

function CardHeaderCliente({
  os,
  semEquipe,
  cliente,
  statusLabel,
}: {
  os: OrdemServicoWithRelations;
  semEquipe: boolean;
  cliente: string;
  statusLabel: string;
}) {
  const bloqueada = osTemBloqueioAtivoListagem(os);

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold leading-snug text-cc-ink">{cliente}</p>
        <p className="mt-0.5 text-xs font-medium text-cc-muted">{statusLabel}</p>
        {bloqueada ? (
          <p className="mt-1">
            <OsBloqueioListBadge />
          </p>
        ) : null}
      </div>

      {semEquipe ? (
        <OsSemEquipeBadge compact />
      ) : (
        <OsOperacionalBadge
          equipeAtual={os.equipe}
          etapaAtual={os.etapa_atual}
          statusAtual={os.status_atual}
          compact
        />
      )}
    </div>
  );
}

function EquipeRow({ os, semEquipe }: { os: OrdemServicoWithRelations; semEquipe: boolean }) {
  return (
    <p className="flex items-center gap-2">
      <span className="shrink-0 text-cc-muted">Team</span>
      {semEquipe ? (
        <OsSemEquipeBadge />
      ) : os.equipe ? (
        <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-cc-ink">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full border border-cc-border"
            style={{ background: os.equipe.cor_primaria }}
          />
          <span className="truncate">{os.equipe.nome}</span>
        </span>
      ) : null}
    </p>
  );
}

/** Card etapa financeira — cliente, status, equipe, entrada. */
function OsOperationalCardFinanceiro({
  os,
  onOpen,
  semEquipe,
  coloredByEquipe,
  viewerCanSeeFinancial = false,
}: {
  os: OrdemServicoWithRelations;
  onOpen: () => void;
  semEquipe: boolean;
  coloredByEquipe: boolean;
  viewerCanSeeFinancial?: boolean;
}) {
  const cliente = os.cliente?.nome?.trim() || "Customer";
  const decision = parseFinancialDecision(os.financial_decision);
  const finDecision = financialDecisionUi(decision);
  const summary = buildFinancialWorkspaceSummary(os);
  const entrada = formatVisitPaymentCardLine(os, {
    awaitingEntry: t("os.card.financial.awaitingEntry"),
    noPayment: t("os.card.financial.noPayment"),
  });
  const temEntrada = hasVisitPaymentCapture(os);
  const statusLabel =
    !viewerCanSeeFinancial && decision === "approved"
      ? t("os.timeline.financialApprovedMasked")
      : finDecision.label;

  return (
    <OperationalCardShell
      os={os}
      semEquipe={semEquipe}
      coloredByEquipe={coloredByEquipe}
      onOpen={onOpen}
    >
      <CardHeaderCliente
        os={os}
        semEquipe={semEquipe}
        cliente={cliente}
        statusLabel={statusLabel}
      />

      <div className="mt-3 space-y-2 text-sm font-light text-cc-deep">
        <EquipeRow os={os} semEquipe={semEquipe} />
        {viewerCanSeeFinancial ? (
          <>
            <p className="flex items-baseline gap-2">
              <span className="shrink-0 text-cc-muted">{t("os.card.financial.entry")}</span>
              <span
                className={`min-w-0 truncate font-medium ${
                  temEntrada ? "text-cc-ink" : "text-cc-muted"
                }`}
              >
                {entrada}
              </span>
            </p>
            <p className="flex items-baseline gap-2">
              <span className="shrink-0 text-cc-muted">{t("os.card.financial.balanceShort")}</span>
              <span className="font-medium tabular-nums text-cc-ink">
                {formatMoneyUsd(summary.balance)}
              </span>
            </p>
          </>
        ) : null}
      </div>
    </OperationalCardShell>
  );
}

/** Card etapa comercial — cliente, status, equipe, visita. */
function OsOperationalCardComercial({
  os,
  onOpen,
  semEquipe,
  coloredByEquipe,
}: {
  os: OrdemServicoWithRelations;
  onOpen: () => void;
  semEquipe: boolean;
  coloredByEquipe: boolean;
}) {
  const cliente = os.cliente?.nome?.trim() || "Customer";
  const statusLabel = labelOperationalStatus(os.status_atual);
  const visitaIso = os.visita_inicial?.data_inicio;
  const visitaLabel = formatOperacionalVisitaCard(visitaIso);
  const visitaAgendada = Boolean(visitaIso);

  return (
    <OperationalCardShell
      os={os}
      semEquipe={semEquipe}
      coloredByEquipe={coloredByEquipe}
      onOpen={onOpen}
    >
      <CardHeaderCliente
        os={os}
        semEquipe={semEquipe}
        cliente={cliente}
        statusLabel={statusLabel}
      />

      <div className="mt-3 space-y-2 text-sm font-light text-cc-deep">
        <EquipeRow os={os} semEquipe={semEquipe} />
        <p
          className={`font-medium leading-snug ${
            visitaAgendada ? "text-cc-ink" : "text-cc-muted"
          }`}
        >
          {visitaLabel}
        </p>
      </div>
    </OperationalCardShell>
  );
}

/** Demais etapas (projeto, instalação, etc.) — título por etapa + visita. */
function OsOperationalCardPadrao({
  os,
  onOpen,
  semEquipe,
  coloredByEquipe,
}: {
  os: OrdemServicoWithRelations;
  onOpen: () => void;
  semEquipe: boolean;
  coloredByEquipe: boolean;
}) {
  const titulo = tituloOperacionalCard({
    etapa_atual: os.etapa_atual,
    status: os.status,
    clienteNome: os.cliente?.nome ?? "Customer",
  });
  const bloqueada = osTemBloqueioAtivoListagem(os);

  return (
    <OperationalCardShell
      os={os}
      semEquipe={semEquipe}
      coloredByEquipe={coloredByEquipe}
      onOpen={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-cc-ink">{titulo}</p>
          {bloqueada ? (
            <p className="mt-1">
              <OsBloqueioListBadge />
            </p>
          ) : null}
        </div>

        {semEquipe ? (
          <OsSemEquipeBadge compact />
        ) : (
          <OsOperacionalBadge
            equipeAtual={os.equipe}
            etapaAtual={os.etapa_atual}
            statusAtual={os.status_atual}
            compact
          />
        )}
      </div>

      <div className="mt-3 space-y-2 text-sm font-light text-cc-deep">
        <EquipeRow os={os} semEquipe={semEquipe} />
        <p className="flex items-center gap-2">
          <span className="text-cc-muted">Visit</span>
          <span className="font-medium text-cc-ink">
            {formatOperacionalVisita(os.visita_inicial?.data_inicio)}
          </span>
        </p>
      </div>
    </OperationalCardShell>
  );
}

export function OsOperationalCard({
  os,
  onOpen,
  viewerCanSeeFinancial = false,
  coloredByEquipe = false,
}: Props) {
  const semEquipe = osSemEquipe(os);
  const stage = parseOsStage(os.etapa_atual);

  if (stage === "financial_review") {
    return (
      <OsOperationalCardFinanceiro
        os={os}
        onOpen={onOpen}
        semEquipe={semEquipe}
        coloredByEquipe={coloredByEquipe}
        viewerCanSeeFinancial={viewerCanSeeFinancial}
      />
    );
  }

  if (stage === "commercial") {
    return (
      <OsOperationalCardComercial
        os={os}
        onOpen={onOpen}
        semEquipe={semEquipe}
        coloredByEquipe={coloredByEquipe}
      />
    );
  }

  return (
    <OsOperationalCardPadrao
      os={os}
      onOpen={onOpen}
      semEquipe={semEquipe}
      coloredByEquipe={coloredByEquipe}
    />
  );
}
