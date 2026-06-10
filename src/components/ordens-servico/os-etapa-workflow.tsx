"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import {
  forcarEtapaOrdemServico,
  obterWorkflowOrdemServico,
  transicionarEtapaOrdemServico,
  type WorkflowOrdemServicoInfo,
} from "@/app/ordens-servico/actions";
import { t, tOsStage } from "@/lib/i18n";
import {
  OS_WORKFLOW_STAGES,
  type OsWorkflowStage,
} from "@/lib/ordens-servico/workflow";

const btnPrimary =
  "rounded-sm bg-cc-ink px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet hover:bg-cc-deep disabled:opacity-40";
const btnGhost =
  "rounded-sm border border-cc-border px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light disabled:opacity-40";
const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus";

type Props = {
  osId: string;
  isAdmin: boolean;
  onEtapaAlterada?: () => void;
};

export function OsEtapaWorkflow({ osId, isAdmin, onEtapaAlterada }: Props) {
  const [workflow, setWorkflow] = useState<WorkflowOrdemServicoInfo | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [adminOpen, setAdminOpen] = useState(false);
  const [forcarEtapa, setForcarEtapa] = useState<OsWorkflowStage>("commercial");
  const [motivo, setMotivo] = useState("");

  const recarregar = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    const { data, error } = await obterWorkflowOrdemServico(osId);
    setLoading(false);
    if (error || !data) {
      setWorkflow(null);
      setMsg(error ?? "Could not load workflow");
      return;
    }
    setWorkflow(data);
    setForcarEtapa(data.etapaAtual);
  }, [osId]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  function avancar(para: OsWorkflowStage) {
    startTransition(async () => {
      setMsg(null);
      const r = await transicionarEtapaOrdemServico(osId, para);
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      await recarregar();
      onEtapaAlterada?.();
    });
  }

  function forcar() {
    if (!confirm("Confirm forced stage change?")) return;
    startTransition(async () => {
      setMsg(null);
      const r = await forcarEtapaOrdemServico(osId, forcarEtapa, motivo);
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      setAdminOpen(false);
      setMotivo("");
      await recarregar();
      onEtapaAlterada?.();
    });
  }

  if (loading) {
    return (
      <p className="text-sm text-cc-muted">Loading operational workflow…</p>
    );
  }

  if (!workflow) {
    return msg ? (
      <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
        {msg}
      </p>
    ) : null;
  }

  const etapaLabel = tOsStage(workflow.etapaAtual);

  return (
    <div className="rounded-ds-lg border border-cc-border bg-cc-border-light/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
            {t("os.workflow.currentStage")}
          </p>
          <p className="mt-0.5 text-sm font-medium text-cc-ink">{etapaLabel}</p>
        </div>
        {workflow.terminal ? (
          <span className="rounded-sm bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
            {t("os.workflow.pipelineDone")}
          </span>
        ) : null}
      </div>

      {!workflow.terminal && workflow.proximas.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
            {t("os.workflow.nextStage")}
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {workflow.proximas.map((op) => (
              <button
                key={op.etapa}
                type="button"
                disabled={pending}
                className={btnPrimary}
                onClick={() => avancar(op.etapa)}
              >
                {pending
                  ? "…"
                  : t("os.workflow.advanceTo", { stage: op.label })}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!workflow.terminal && workflow.proximas.length === 0 ? (
        <p className="mt-3 text-sm text-cc-muted">
          No transitions available at this stage.
        </p>
      ) : null}

      {isAdmin && workflow.podeForcar ? (
        <div className="mt-4 border-t border-cc-border pt-4">
          {!adminOpen ? (
            <button
              type="button"
              className={btnGhost}
              onClick={() => setAdminOpen(true)}
            >
              {t("os.workflow.forceStage")}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-rose-deep">
                Admin — stage correction
              </p>
              <label className="block text-sm text-cc-deep">
                <span className="mb-1 block text-xs text-cc-muted">Stage</span>
                <select
                  value={forcarEtapa}
                  onChange={(e) =>
                    setForcarEtapa(e.target.value as OsWorkflowStage)
                  }
                  className={inputClass}
                >
                  {OS_WORKFLOW_STAGES.map((e) => (
                    <option key={e} value={e}>
                      {tOsStage(e)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-cc-deep">
                <span className="mb-1 block text-xs text-cc-muted">
                  Reason (optional)
                </span>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className={inputClass}
                  placeholder="E.g. correction after financial review"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  className={btnPrimary}
                  onClick={forcar}
                >
                  {pending ? "Saving…" : "Confirm change"}
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => {
                    setAdminOpen(false);
                    setMotivo("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {msg ? (
        <p className="mt-3 rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
