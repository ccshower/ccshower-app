"use client";



import { useEffect, useState, useTransition } from "react";



import {

  aprovarFinanceiro,

  atualizarValorFinalFinanceiro,

  reprovarFinanceiro,

} from "@/app/ordens-servico/financeiro-actions";

import {

  OsValorEditableField,

  OsValorReadonlyRow,

} from "@/components/ordens-servico/os-valores-etapa-fields";

import { t } from "@/lib/i18n";

import {

  buildFinancialWorkspaceSummary,

  financialDecisionUi,

  formatMoneyUsd,

  parseFinancialDecision,

} from "@/lib/ordens-servico/financial-workspace";

import { initialValorFinalInput } from "@/lib/ordens-servico/os-valores-etapa";

import type { OrdemServicoWithRelations } from "@/lib/types/database";



const sectionLabel =

  "text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted";



type Props = {

  ordem: OrdemServicoWithRelations;

  fluxoBloqueado?: boolean;

  onAtualizado: () => void;

  viewerCanSeeFinancial?: boolean;

};



function StatusDot({ tone }: { tone: "pending" | "approved" | "rejected" }) {

  const colors = {

    pending: "bg-amber-400",

    approved: "bg-emerald-500",

    rejected: "bg-red-500",

  };

  return (

    <span

      className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${colors[tone]}`}

      aria-hidden

    />

  );

}



export function OsWorkspaceFinancial({

  ordem,

  fluxoBloqueado = false,

  onAtualizado,

  viewerCanSeeFinancial = false,

}: Props) {

  const decision = parseFinancialDecision(ordem.financial_decision);

  const statusUi = financialDecisionUi(decision);



  if (!viewerCanSeeFinancial) {

    const maskedLabel =

      decision === "approved"

        ? t("os.timeline.financialApprovedMasked")

        : statusUi.label;



    return (

      <div className="space-y-3 rounded-sm border border-cc-border/80 bg-cc-surface/30 p-4">

        <p className={sectionLabel}>{t("os.workspace.financial.statusLabel")}</p>

        <div className="flex items-center gap-2">

          <StatusDot tone={statusUi.tone} />

          <span className="text-sm font-medium text-cc-ink">{maskedLabel}</span>

        </div>

        <p className="text-sm font-light text-cc-muted">

          {t("os.workspace.financial.restrictedHint")}

        </p>

      </div>

    );

  }



  return (

    <OsWorkspaceFinancialForm

      ordem={ordem}

      fluxoBloqueado={fluxoBloqueado}

      onAtualizado={onAtualizado}

    />

  );

}



function OsWorkspaceFinancialForm({

  ordem,

  fluxoBloqueado = false,

  onAtualizado,

}: {

  ordem: OrdemServicoWithRelations;

  fluxoBloqueado?: boolean;

  onAtualizado: () => void;

}) {

  const [valorFinal, setValorFinal] = useState(initialValorFinalInput(ordem));

  const [motivo, setMotivo] = useState(ordem.financial_rejection_reason ?? "");

  const [showReject, setShowReject] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();



  const summary = buildFinancialWorkspaceSummary(ordem, { totalInput: valorFinal });

  const decision = parseFinancialDecision(ordem.financial_decision);

  const statusUi = financialDecisionUi(decision);

  const canAct = decision === "pending" || decision === "rejected";



  useEffect(() => {

    setValorFinal(initialValorFinalInput(ordem));

    setMotivo(ordem.financial_rejection_reason ?? "");

    setShowReject(false);

    setMsg(null);

  }, [

    ordem.id,

    ordem.valor_comercial,

    ordem.valor_projeto,

    ordem.valor_final,

    ordem.financial_rejection_reason,

    ordem.financial_decision,

  ]);



  function salvarValorFinal() {

    startTransition(async () => {

      setMsg(null);

      const r = await atualizarValorFinalFinanceiro(ordem.id, valorFinal);

      if (!r.ok) {

        setMsg(r.message);

        return;

      }

      onAtualizado();

    });

  }



  function aprovar() {

    if (!confirm(t("os.workspace.financial.confirmApprove"))) return;

    startTransition(async () => {

      setMsg(null);

      const save = await atualizarValorFinalFinanceiro(ordem.id, valorFinal);

      if (!save.ok) {

        setMsg(save.message);

        return;

      }

      const r = await aprovarFinanceiro(ordem.id);

      if (!r.ok) {

        setMsg(r.message);

        return;

      }

      onAtualizado();

    });

  }



  function reprovar() {

    startTransition(async () => {

      setMsg(null);

      const r = await reprovarFinanceiro(ordem.id, motivo);

      if (!r.ok) {

        setMsg(r.message);

        return;

      }

      setShowReject(false);

      onAtualizado();

    });

  }



  return (

    <div className="space-y-4">

      <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">

        <OsValorReadonlyRow

          label={t("os.workspace.valores.commercial")}

          value={ordem.valor_comercial}

        />

        <OsValorReadonlyRow

          label={t("os.workspace.valores.project")}

          value={ordem.valor_projeto}

        />

        <div className="mt-3 border-t border-cc-border/50 pt-3">

          {canAct ? (

            <OsValorEditableField

              label={t("os.workspace.valores.final")}

              value={valorFinal}

              disabled={pending}

              onChange={setValorFinal}

              onBlur={salvarValorFinal}

            />

          ) : (

            <>

              <p className={sectionLabel}>{t("os.workspace.valores.final")}</p>

              <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-cc-ink">

                {formatMoneyUsd(summary.total)}

              </p>

            </>

          )}

        </div>

      </section>



      <section className="rounded-sm border border-cc-border/80 bg-white px-3 py-2.5">

        <p className={sectionLabel}>{t("os.workspace.financial.receivedLabel")}</p>

        <p

          className={`mt-1 text-sm font-medium ${

            summary.hasPaymentCapture ? "text-cc-ink" : "text-cc-muted"

          }`}

        >

          {summary.receivedLine}

        </p>

      </section>



      <section className="rounded-sm border border-cc-border/80 bg-white px-3 py-2.5">

        <p className={sectionLabel}>{t("os.workspace.financial.balanceLabel")}</p>

        <p className="mt-1 text-xl font-semibold tabular-nums text-cc-ink">

          {formatMoneyUsd(summary.balance)}

        </p>

      </section>



      <section className="rounded-sm border border-cc-border/80 bg-white px-3 py-2.5">

        <p className={sectionLabel}>{t("os.workspace.financial.statusLabel")}</p>

        <div className="mt-1.5 flex items-center gap-2">

          <StatusDot tone={statusUi.tone} />

          <span className="text-sm font-medium text-cc-ink">{statusUi.label}</span>

        </div>

        {decision === "rejected" && ordem.financial_rejection_reason ? (

          <p className="mt-2 text-sm font-light leading-snug text-cc-deep">

            {ordem.financial_rejection_reason}

          </p>

        ) : null}

      </section>



      {canAct ? (

        <div className="space-y-2 border-t border-cc-border-light pt-3">

          {showReject ? (

            <div className="space-y-2 rounded-sm border border-cc-border bg-cc-surface/40 p-3">

              <label

                htmlFor={`motivo-fin-${ordem.id}`}

                className="block text-xs font-semibold text-cc-deep"

              >

                {t("os.workspace.financial.rejectReason")}

              </label>

              <textarea

                id={`motivo-fin-${ordem.id}`}

                required

                rows={3}

                disabled={pending}

                value={motivo}

                onChange={(e) => setMotivo(e.target.value)}

                className="w-full resize-y rounded-sm border border-cc-border px-3 py-2 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus"

                placeholder={t("os.workspace.financial.rejectReasonPlaceholder")}

              />

              <div className="flex gap-2">

                <button

                  type="button"

                  disabled={pending}

                  onClick={() => setShowReject(false)}

                  className="flex-1 rounded-sm border border-cc-border px-3 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-cc-muted"

                >

                  {t("os.workspace.financial.cancel")}

                </button>

                <button

                  type="button"

                  disabled={pending || !motivo.trim()}

                  onClick={reprovar}

                  className="flex-1 rounded-sm bg-cc-red px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-40"

                >

                  {t("os.workspace.financial.confirmReject")}

                </button>

              </div>

            </div>

          ) : (

            <div className="grid gap-2 sm:grid-cols-2">

              <button

                type="button"

                disabled={pending || fluxoBloqueado}

                onClick={aprovar}

                className="rounded-sm bg-cc-ink py-3 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-lift hover:bg-cc-deep disabled:opacity-40"

              >

                {pending

                  ? t("os.workspace.financial.approving")

                  : t("os.workspace.financial.approve")}

              </button>

              <button

                type="button"

                disabled={pending}

                onClick={() => setShowReject(true)}

                className="rounded-sm border border-cc-border py-3 text-xs font-semibold uppercase tracking-[0.1em] text-cc-deep hover:bg-cc-border-light disabled:opacity-40"

              >

                {t("os.workspace.financial.reject")}

              </button>

            </div>

          )}

        </div>

      ) : null}



      {msg ? (

        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">

          {msg}

        </p>

      ) : null}

    </div>

  );

}

