"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import {
  agendarInstalacaoProjeto,
  finalizarAgendamentoInstalacao,
  listarEquipesInstalacaoProjeto,
} from "@/app/ordens-servico/projeto-actions";
import { validarSlotVisitaDisponivel } from "@/app/ordens-servico/agenda-disponibilidade";
import {
  OsAgendaSlotConflictModal,
  type OsAgendaSlotConflictDraft,
} from "@/components/ordens-servico/os-agenda-slot-conflict-modal";
import { OsVisitaAgendaPicker } from "@/components/ordens-servico/os-visita-agenda-picker";
import { Field } from "@/components/ui/field";
import { formatYmdAmerican, parseVisitaDateTime } from "@/lib/ordens-servico/datetime";
import {
  compararYmd,
  formatIntervaloAgenda,
  horaFimPadraoParaInicio,
} from "@/lib/ordens-servico/visita-slots";
import { filterEquipesForStage } from "@/lib/ordens-servico/workflow-equipe";
import { t } from "@/lib/i18n";
import type { Equipe, OrdemServicoWithRelations } from "@/lib/types/database";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus";

const sectionLabel =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted";

type Props = {
  ordem: OrdemServicoWithRelations;
  equipes: Equipe[];
  fluxoBloqueado?: boolean;
  onAtualizado: () => void;
  onConcluido: () => void;
};

function resolveInitialInstalacao(
  ordem: OrdemServicoWithRelations,
  installationEquipes: Equipe[],
) {
  const agendada = ordem.instalacao_agendada;
  const parsed = agendada?.data_inicio
    ? parseVisitaDateTime(agendada.data_inicio)
    : { data: "", hora: "" };
  const parsedFim = agendada?.data_fim
    ? parseVisitaDateTime(agendada.data_fim)
    : null;
  const horaFim =
    parsedFim?.hora.slice(0, 5) ??
    (parsed.hora ? horaFimPadraoParaInicio(parsed.hora) : "") ??
    "";
  const equipeId =
    agendada?.equipe_id &&
    installationEquipes.some((e) => e.id === agendada.equipe_id)
      ? agendada.equipe_id
      : installationEquipes[0]?.id ?? "";

  return {
    equipeId,
    data: parsed.data,
    hora: parsed.hora,
    horaFim,
    agendada: Boolean(agendada?.id && parsed.data && parsed.hora && horaFim),
  };
}

/** Etapa Install Schedule — agendar instalação antes de ir para Installation. */
export function OsWorkspaceInstallSchedule({
  ordem,
  equipes,
  fluxoBloqueado = false,
  onAtualizado,
  onConcluido,
}: Props) {
  const [installationEquipes, setInstallationEquipes] = useState<Equipe[]>(() =>
    filterEquipesForStage(equipes, "installation"),
  );
  const [installationEquipesLoading, setInstallationEquipesLoading] =
    useState(true);
  const [installationEquipesError, setInstallationEquipesError] = useState<
    string | null
  >(null);
  const initialInstalacao = useMemo(
    () => resolveInitialInstalacao(ordem, installationEquipes),
    [ordem, installationEquipes],
  );
  const [equipeInstalacaoId, setEquipeInstalacaoId] = useState(
    () => initialInstalacao.equipeId,
  );
  const [dataInstalacao, setDataInstalacao] = useState(
    () => initialInstalacao.data,
  );
  const [horaInstalacao, setHoraInstalacao] = useState(
    () => initialInstalacao.hora,
  );
  const [horaFimInstalacao, setHoraFimInstalacao] = useState(
    () => initialInstalacao.horaFim,
  );
  const [instalacaoAgendada, setInstalacaoAgendada] = useState(
    () => initialInstalacao.agendada,
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [finalizePending, startFinalizeTransition] = useTransition();
  const [instalacaoPending, startInstalacaoTransition] = useTransition();
  const [conflictDraft, setConflictDraft] =
    useState<OsAgendaSlotConflictDraft | null>(null);

  const dataPrevistaMaterial = ordem.data_prevista_material?.slice(0, 10) ?? "";

  useEffect(() => {
    const nextInst = resolveInitialInstalacao(ordem, installationEquipes);
    setEquipeInstalacaoId(nextInst.equipeId);
    setDataInstalacao(nextInst.data);
    setHoraInstalacao(nextInst.hora);
    setHoraFimInstalacao(nextInst.horaFim);
    setInstalacaoAgendada(nextInst.agendada);
  }, [ordem.instalacao_agendada, ordem.id, installationEquipes]);

  const carregarEquipesInstalacao = useCallback(async () => {
    setInstallationEquipesLoading(true);
    setInstallationEquipesError(null);
    const { equipes: loaded, error } = await listarEquipesInstalacaoProjeto();
    setInstallationEquipesLoading(false);

    if (error) {
      setInstallationEquipesError(error);
      setInstallationEquipes([]);
      return;
    }

    setInstallationEquipes(loaded);
  }, []);

  useEffect(() => {
    void carregarEquipesInstalacao();
  }, [carregarEquipesInstalacao]);

  useEffect(() => {
    setEquipeInstalacaoId((current) => {
      if (current && installationEquipes.some((e) => e.id === current)) {
        return current;
      }
      return resolveInitialInstalacao(ordem, installationEquipes).equipeId;
    });
  }, [installationEquipes, ordem]);

  async function persistirAgendamentoInstalacao(
    data: string,
    hora: string,
    horaFim: string,
  ): Promise<boolean> {
    const r = await agendarInstalacaoProjeto(
      ordem.id,
      equipeInstalacaoId,
      data,
      hora,
      horaFim,
    );
    if (!r.ok) {
      setMsg(r.message);
      return false;
    }
    setInstalacaoAgendada(true);
    onAtualizado();
    return true;
  }

  function salvarAgendamentoInstalacao(
    horaOverride?: string,
    horaFimOverride?: string,
  ) {
    const hora = horaOverride ?? horaInstalacao;
    const horaFim = horaFimOverride ?? horaFimInstalacao;
    startInstalacaoTransition(async () => {
      setMsg(null);
      setConflictDraft(null);

      if (
        dataPrevistaMaterial &&
        compararYmd(dataInstalacao, dataPrevistaMaterial) < 0
      ) {
        setMsg(t("os.workspace.project.installationBeforeMaterial"));
        return;
      }

      const slotOk = await validarSlotVisitaDisponivel(
        equipeInstalacaoId,
        dataInstalacao,
        hora,
        horaFim,
        ordem.instalacao_agendada?.id ?? null,
      );

      if (!slotOk.ok) {
        if ("conflito" in slotOk && slotOk.conflito) {
          const equipeNome =
            installationEquipes.find((e) => e.id === equipeInstalacaoId)
              ?.nome ?? "Team";
          setConflictDraft({
            equipeNome,
            dataYmd: dataInstalacao,
            horaSolicitada: formatIntervaloAgenda(
              slotOk.horaSolicitada,
              slotOk.horaFimSolicitada,
            ),
            sugestoes: slotOk.sugestoes.map((s) =>
              formatIntervaloAgenda(s.hora, s.horaFim),
            ),
            alreadyBookedMessage: t(
              "os.workspace.project.installationConflictAlreadyBooked",
            ),
          });
          return;
        }
        setMsg(slotOk.message);
        return;
      }

      if (horaOverride) setHoraInstalacao(horaOverride);
      if (horaFimOverride) setHoraFimInstalacao(horaFimOverride);

      await persistirAgendamentoInstalacao(dataInstalacao, hora, horaFim);
    });
  }

  function onInstalacaoConflictPickSlot(slot: string) {
    setConflictDraft(null);
    const parts = slot.split("–").map((part) => part.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      salvarAgendamentoInstalacao(parts[0], parts[1]);
      return;
    }
    salvarAgendamentoInstalacao(slot);
  }

  function finalizar() {
    if (!confirm(t("os.workspace.installSchedule.confirmFinish"))) return;
    startFinalizeTransition(async () => {
      setMsg(null);
      const r = await finalizarAgendamentoInstalacao(ordem.id);
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      onConcluido();
    });
  }

  const busy = finalizePending || instalacaoPending;

  return (
    <div className="space-y-4">
      {dataPrevistaMaterial ? (
        <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 px-3 py-2.5 text-sm text-cc-muted">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted">
            {t("os.workspace.project.materialDateTitle")}
          </span>
          <p className="mt-1 font-medium text-cc-ink">
            {formatYmdAmerican(dataPrevistaMaterial)}
          </p>
        </section>
      ) : null}

      <section className="rounded-sm border border-cc-border/80 bg-white p-3">
        <p className={sectionLabel}>
          {t("os.workspace.project.installationSchedulingTitle")}
        </p>

        <div className="mt-3 space-y-3">
          <Field label={t("os.workspace.project.installationTeamLabel")}>
            <select
              value={equipeInstalacaoId}
              disabled={
                busy ||
                fluxoBloqueado ||
                installationEquipesLoading ||
                installationEquipes.length === 0
              }
              onChange={(e) => {
                setEquipeInstalacaoId(e.target.value);
                setHoraInstalacao("");
              }}
              className={inputClass}
            >
              <option value="" disabled>
                {installationEquipesLoading
                  ? "Loading installation teams…"
                  : installationEquipesError
                    ? installationEquipesError
                    : installationEquipes.length === 0
                      ? "No installation teams available"
                      : t("os.workspace.project.installationTeamPlaceholder")}
              </option>
              {installationEquipes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </Field>
          {installationEquipesError && !installationEquipesLoading ? (
            <p className="text-xs text-cc-red">{installationEquipesError}</p>
          ) : null}

          <OsVisitaAgendaPicker
            equipes={installationEquipes}
            equipeId={equipeInstalacaoId}
            dataVisita={dataInstalacao}
            horaVisita={horaInstalacao}
            horaFimVisita={horaFimInstalacao}
            onDataChange={setDataInstalacao}
            onHoraChange={setHoraInstalacao}
            onHoraFimChange={setHoraFimInstalacao}
            excluirEventoId={ordem.instalacao_agendada?.id ?? null}
            fieldLabel={t("os.workspace.project.installationDateTimeLabel")}
            dataMinimaYmd={dataPrevistaMaterial || null}
          />

          {instalacaoAgendada ? (
            <p className="text-xs font-light text-cc-muted">
              {t("os.workspace.project.installationScheduled")}
            </p>
          ) : null}

          <button
            type="button"
            disabled={
              busy ||
              fluxoBloqueado ||
              !equipeInstalacaoId ||
              !dataInstalacao ||
              !horaInstalacao ||
              !horaFimInstalacao ||
              installationEquipes.length === 0
            }
            onClick={() => salvarAgendamentoInstalacao()}
            className="w-full rounded-sm border border-cc-border bg-white py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light disabled:opacity-40"
          >
            {instalacaoPending
              ? t("os.workspace.project.savingInstallationSchedule")
              : t("os.workspace.project.saveInstallationSchedule")}
          </button>
        </div>
      </section>

      {msg ? (
        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
          {msg}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy || fluxoBloqueado || !instalacaoAgendada}
        onClick={finalizar}
        className="w-full rounded-sm bg-cc-ink py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-lift hover:bg-cc-deep disabled:opacity-40"
      >
        {finalizePending
          ? t("os.workspace.installSchedule.finishing")
          : t("os.workspace.installSchedule.finish")}
      </button>

      <OsAgendaSlotConflictModal
        draft={conflictDraft}
        onClose={() => setConflictDraft(null)}
        onPickSlot={onInstalacaoConflictPickSlot}
      />
    </div>
  );
}
