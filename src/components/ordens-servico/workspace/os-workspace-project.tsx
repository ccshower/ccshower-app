"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  agendarInstalacaoProjeto,
  finalizarProjeto,
  listarCatalogoItens,
  listarEquipesInstalacaoProjeto,
  listarFornecedores,
  salvarDataPrevistaMaterial,
  salvarFornecedorProjeto,
  salvarObservacoesInstalacao,
  salvarValorProjeto,
} from "@/app/ordens-servico/projeto-actions";
import { validarSlotVisitaDisponivel } from "@/app/ordens-servico/agenda-disponibilidade";
import {
  OsAgendaSlotConflictModal,
  type OsAgendaSlotConflictDraft,
} from "@/components/ordens-servico/os-agenda-slot-conflict-modal";
import {
  OsValorEditableField,
  OsValorReadonlyRow,
} from "@/components/ordens-servico/os-valores-etapa-fields";
import { OsVisitaAgendaPicker } from "@/components/ordens-servico/os-visita-agenda-picker";
import { Field } from "@/components/ui/field";
import { initialValorProjetoInput } from "@/lib/ordens-servico/os-valores-etapa";
import { OsAmbientesVisitPhotosProject } from "@/components/ordens-servico/workspace/os-ambientes-visit-photos-project";
import { OsSeparationListCard } from "@/components/ordens-servico/workspace/os-separation-list-card";
import { OsSeparationListModal } from "@/components/ordens-servico/workspace/os-separation-list-modal";
import { parseVisitaDateTime } from "@/lib/ordens-servico/datetime";
import {
  compararYmd,
  formatIntervaloAgenda,
  hojeOperacionalYmd,
  horaFimPadraoParaInicio,
} from "@/lib/ordens-servico/visita-slots";
import { filterEquipesForStage } from "@/lib/ordens-servico/workflow-equipe";
import { t } from "@/lib/i18n";
import { uploadCncViaApi } from "@/lib/ordens-servico/upload-cnc-client";
import type {
  CatalogoItem,
  Equipe,
  Fornecedor,
  OrdemServicoWithRelations,
} from "@/lib/types/database";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

const textareaClass =
  "w-full min-h-[100px] resize-y rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

const sectionLabel =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted";

const NOTES_SAVE_DELAY_MS = 800;

type NotesSaveStatus = "idle" | "saving" | "saved" | "error";

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

/** Execução etapa Projeto — CNC, lista de separação, observações. */
export function OsWorkspaceProject({
  ordem,
  equipes,
  fluxoBloqueado = false,
  onAtualizado,
  onConcluido,
}: Props) {
  const [valorProjeto, setValorProjeto] = useState(initialValorProjetoInput(ordem));
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
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedoresLoading, setFornecedoresLoading] = useState(true);
  const [fornecedoresError, setFornecedoresError] = useState<string | null>(
    null,
  );
  const [fornecedorId, setFornecedorId] = useState(
    () => ordem.fornecedor_id ?? "",
  );
  const [dataPrevistaMaterial, setDataPrevistaMaterial] = useState(
    () => ordem.data_prevista_material?.slice(0, 10) ?? "",
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
  const [installationNotes, setInstallationNotes] = useState(
    ordem.installation_notes ?? "",
  );
  const [notesStatus, setNotesStatus] = useState<NotesSaveStatus>("idle");
  const [listaMode, setListaMode] = useState<"view" | "edit" | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [valorPending, startValorTransition] = useTransition();
  const [cncPending, startCncTransition] = useTransition();
  const [finalizePending, startFinalizeTransition] = useTransition();
  const [fornecedorPending, startFornecedorTransition] = useTransition();
  const [materialPending, startMaterialTransition] = useTransition();
  const [instalacaoPending, startInstalacaoTransition] = useTransition();
  const [conflictDraft, setConflictDraft] =
    useState<OsAgendaSlotConflictDraft | null>(null);
  const cncRef = useRef<HTMLInputElement>(null);
  const savedNotesRef = useRef(ordem.installation_notes ?? "");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAtualizadoRef = useRef(onAtualizado);

  useEffect(() => {
    onAtualizadoRef.current = onAtualizado;
  }, [onAtualizado]);

  const itens = ordem.lista_separacao ?? [];
  const anexosCnc =
    ordem.anexos_cnc?.length
      ? ordem.anexos_cnc
      : ordem.anexo_cnc
        ? [ordem.anexo_cnc]
        : [];
  const clienteNome = ordem.cliente?.nome ?? ordem.titulo;

  useEffect(() => {
    setValorProjeto(initialValorProjetoInput(ordem));
    setFornecedorId(ordem.fornecedor_id ?? "");
    setDataPrevistaMaterial(ordem.data_prevista_material?.slice(0, 10) ?? "");
    const nextInst = resolveInitialInstalacao(ordem, installationEquipes);
    setEquipeInstalacaoId(nextInst.equipeId);
    setDataInstalacao(nextInst.data);
    setHoraInstalacao(nextInst.hora);
    setHoraFimInstalacao(nextInst.horaFim);
    setInstalacaoAgendada(nextInst.agendada);
    const next = ordem.installation_notes ?? "";
    setInstallationNotes((prev) => {
      if (prev.trim() === next.trim()) return prev;
      setNotesStatus("idle");
      return next;
    });
    savedNotesRef.current = next;
  }, [
    ordem.installation_notes,
    ordem.valor_comercial,
    ordem.valor_projeto,
    ordem.fornecedor_id,
    ordem.data_prevista_material,
    ordem.instalacao_agendada,
    ordem.id,
    installationEquipes,
  ]);

  useEffect(() => {
    if (!dataInstalacao) return;
    const hoje = hojeOperacionalYmd();
    const limiteMinimo =
      dataPrevistaMaterial &&
      /^\d{4}-\d{2}-\d{2}$/.test(dataPrevistaMaterial) &&
      compararYmd(dataPrevistaMaterial, hoje) > 0
        ? dataPrevistaMaterial
        : hoje;
    if (compararYmd(dataInstalacao, limiteMinimo) < 0) {
      setDataInstalacao("");
      setHoraInstalacao("");
    }
  }, [dataPrevistaMaterial, dataInstalacao]);

  function salvarValor() {
    startValorTransition(async () => {
      setMsg(null);
      const r = await salvarValorProjeto(ordem.id, valorProjeto);
      if (!r.ok) setMsg(r.message);
      else onAtualizadoRef.current();
    });
  }

  const carregarCatalogo = useCallback(async () => {
    const { itens, error } = await listarCatalogoItens();
    if (!error) setCatalogo(itens);
  }, []);

  const carregarFornecedores = useCallback(async () => {
    setFornecedoresLoading(true);
    setFornecedoresError(null);
    const { itens, error } = await listarFornecedores();
    setFornecedoresLoading(false);
    if (error) {
      setFornecedoresError(error);
      setFornecedores([]);
      return;
    }
    setFornecedores(itens);
  }, []);

  const carregarEquipesInstalacao = useCallback(async () => {
    setInstallationEquipesLoading(true);
    setInstallationEquipesError(null);
    const { equipes: loaded, error, debug } = await listarEquipesInstalacaoProjeto();
    setInstallationEquipesLoading(false);

    if (debug) {
      console.info("[OsWorkspaceProject] equipes instalação:", {
        totalDb: debug.inputTotal,
        totalFiltradas: debug.matchedTotal,
        filtro: `codigo_operacional=${debug.expectedCode} ou nome≈instal*`,
        rows: debug.rows,
      });
    }

    if (error) {
      setInstallationEquipesError(error);
      setInstallationEquipes([]);
      return;
    }

    setInstallationEquipes(loaded);
    if (loaded.length === 0 && debug && debug.inputTotal > 0) {
      setInstallationEquipesError(
        "Teams are visible in the database, but none are classified as installation. Check codigo_operacional or name (e.g. Installation A).",
      );
    }
  }, []);

  useEffect(() => {
    void carregarCatalogo();
    void carregarFornecedores();
    void carregarEquipesInstalacao();
  }, [carregarCatalogo, carregarFornecedores, carregarEquipesInstalacao]);

  useEffect(() => {
    setEquipeInstalacaoId((current) => {
      if (current && installationEquipes.some((e) => e.id === current)) {
        return current;
      }
      return resolveInitialInstalacao(ordem, installationEquipes).equipeId;
    });
  }, [installationEquipes, ordem]);

  useEffect(() => {
    const current = installationNotes.trim();
    const saved = savedNotesRef.current.trim();
    if (current === saved) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void (async () => {
        setNotesStatus("saving");
        setMsg(null);
        const r = await salvarObservacoesInstalacao(ordem.id, installationNotes);
        if (!r.ok) {
          setNotesStatus("error");
          setMsg(r.message);
          return;
        }
        savedNotesRef.current = installationNotes;
        setNotesStatus("saved");
        onAtualizadoRef.current();
        if (savedIndicatorTimerRef.current) {
          clearTimeout(savedIndicatorTimerRef.current);
        }
        savedIndicatorTimerRef.current = setTimeout(
          () => setNotesStatus("idle"),
          2500,
        );
      })();
    }, NOTES_SAVE_DELAY_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [installationNotes, ordem.id]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedIndicatorTimerRef.current) {
        clearTimeout(savedIndicatorTimerRef.current);
      }
    },
    [],
  );

  function finalizar() {
    if (!confirm(t("os.workspace.project.confirmFinish"))) return;
    startFinalizeTransition(async () => {
      setMsg(null);
      if (installationNotes.trim() !== savedNotesRef.current.trim()) {
        const save = await salvarObservacoesInstalacao(
          ordem.id,
          installationNotes,
        );
        if (!save.ok) {
          setMsg(save.message);
          return;
        }
        savedNotesRef.current = installationNotes;
      }
      const saveValor = await salvarValorProjeto(ordem.id, valorProjeto);
      if (!saveValor.ok) {
        setMsg(saveValor.message);
        return;
      }

      if (fornecedorId) {
        const saveFornecedor = await salvarFornecedorProjeto(
          ordem.id,
          fornecedorId,
        );
        if (!saveFornecedor.ok) {
          setMsg(saveFornecedor.message);
          return;
        }
      }

      if (dataPrevistaMaterial.trim()) {
        const saveMaterial = await salvarDataPrevistaMaterial(
          ordem.id,
          dataPrevistaMaterial,
        );
        if (!saveMaterial.ok) {
          setMsg(saveMaterial.message);
          return;
        }
      }

      if (equipeInstalacaoId && dataInstalacao && horaInstalacao && horaFimInstalacao) {
        const saveInstalacao = await agendarInstalacaoProjeto(
          ordem.id,
          equipeInstalacaoId,
          dataInstalacao,
          horaInstalacao,
          horaFimInstalacao,
        );
        if (!saveInstalacao.ok) {
          setMsg(saveInstalacao.message);
          return;
        }
      }

      const r = await finalizarProjeto(ordem.id);
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      onConcluido();
    });
  }

  function salvarFornecedor(nextId: string) {
    startFornecedorTransition(async () => {
      setMsg(null);
      const r = await salvarFornecedorProjeto(ordem.id, nextId);
      if (!r.ok) setMsg(r.message);
      else onAtualizadoRef.current();
    });
  }

  function salvarDataMaterial() {
    if (!dataPrevistaMaterial.trim()) return;

    const hoje = hojeOperacionalYmd();
    if (compararYmd(dataPrevistaMaterial, hoje) < 0) {
      setMsg(t("os.workspace.project.materialDateBeforeToday"));
      return;
    }

    startMaterialTransition(async () => {
      setMsg(null);
      const r = await salvarDataPrevistaMaterial(ordem.id, dataPrevistaMaterial);
      if (!r.ok) setMsg(r.message);
      else onAtualizadoRef.current();
    });
  }

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
    onAtualizadoRef.current();
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

      if (horaOverride) {
        setHoraInstalacao(horaOverride);
      }
      if (horaFimOverride) {
        setHoraFimInstalacao(horaFimOverride);
      }

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

  const busy =
    valorPending ||
    cncPending ||
    finalizePending ||
    notesStatus === "saving" ||
    fornecedorPending ||
    materialPending ||
    instalacaoPending;

  function onCncSelected(files: FileList | null) {
    if (!files?.length) return;
    const toUpload = Array.from(files);
    startCncTransition(async () => {
      setMsg(null);
      const r = await uploadCncViaApi(ordem.id, toUpload);
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      if (cncRef.current) cncRef.current.value = "";
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
        <div className="mt-3 border-t border-cc-border/50 pt-3">
          <OsValorEditableField
            label={t("os.workspace.valores.project")}
            value={valorProjeto}
            disabled={busy}
            onChange={setValorProjeto}
            onBlur={salvarValor}
          />
        </div>
      </section>

      <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
        <p className={sectionLabel}>{t("os.workspace.project.supplierTitle")}</p>
        <div className="mt-3 space-y-3">
          <Field label={t("os.workspace.project.supplierTitle")}>
            <select
            value={fornecedorId}
            disabled={busy || fornecedoresLoading || fornecedores.length === 0}
            onChange={(e) => {
              const next = e.target.value;
              setFornecedorId(next);
              if (next) salvarFornecedor(next);
            }}
            className={inputClass}
          >
            <option value="" disabled>
              {fornecedoresLoading
                ? t("os.workspace.project.supplierLoading")
                : fornecedoresError
                  ? fornecedoresError
                  : fornecedores.length === 0
                    ? t("os.workspace.project.supplierNone")
                    : t("os.workspace.project.supplierPlaceholder")}
            </option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
          </Field>
          {fornecedoresError ? (
            <p className="text-xs text-cc-red">{fornecedoresError}</p>
          ) : null}

          <Field label={t("os.workspace.project.materialDateTitle")}>
            <input
              type="date"
              value={dataPrevistaMaterial}
              min={hojeOperacionalYmd()}
              disabled={busy}
              onChange={(e) => setDataPrevistaMaterial(e.target.value)}
              onBlur={salvarDataMaterial}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

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

      <OsAmbientesVisitPhotosProject ordem={ordem} />

      <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
        <p className={sectionLabel}>{t("os.workspace.project.cncTitle")}</p>
        <p className="mt-1 text-xs font-light text-cc-muted">
          {t("os.workspace.project.cncHint")}
        </p>

        {anexosCnc.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {anexosCnc.map((item) => (
              <li key={item.id} className="space-y-1">
                <p className="truncate text-sm font-medium text-cc-ink">
                  {item.nome_arquivo}
                </p>
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs font-medium text-cc-deep underline"
                  >
                    {t("os.workspace.project.cncOpen")}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-cc-muted">
            {t("os.workspace.project.cncNone")}
          </p>
        )}

        <input
          ref={cncRef}
          type="file"
          multiple
          accept=".nc,.txt,.tap,.gcode,.pdf,.dxf,.dwg,application/pdf,text/plain"
          className="hidden"
          disabled={busy}
          onChange={(e) => onCncSelected(e.target.files)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => cncRef.current?.click()}
          className="mt-3 w-full rounded-sm border border-cc-border bg-white py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light disabled:opacity-40"
        >
          {anexosCnc.length > 0
            ? t("os.workspace.project.cncAdd")
            : t("os.workspace.project.cncUpload")}
        </button>
      </section>

      <OsSeparationListCard
        count={itens.length}
        onVer={itens.length > 0 ? () => setListaMode("view") : undefined}
        onEditar={() => setListaMode("edit")}
      />

      <section className="rounded-sm border border-cc-border/80 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <p className={sectionLabel}>
            {t("os.workspace.project.installationNotesTitle")}
          </p>
          {notesStatus === "saving" ? (
            <span className="text-[11px] font-light text-cc-subtle">
              {t("os.workspace.project.notesSaving")}
            </span>
          ) : null}
          {notesStatus === "saved" ? (
            <span className="text-[11px] font-light text-cc-subtle">
              {t("os.workspace.project.notesSaved")}
            </span>
          ) : null}
        </div>
        <textarea
          className={`mt-2 ${textareaClass}`}
          placeholder={t("os.workspace.project.installationNotesPlaceholder")}
          value={installationNotes}
          onChange={(e) => setInstallationNotes(e.target.value)}
        />
      </section>

      {msg ? (
        <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
          {msg}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy || fluxoBloqueado}
        onClick={finalizar}
        className="w-full rounded-sm bg-cc-ink py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-white shadow-lift hover:bg-cc-deep disabled:opacity-40"
      >
        {finalizePending
          ? t("os.workspace.project.finishingProject")
          : t("os.workspace.project.finishProject")}
      </button>

      <OsSeparationListModal
        osId={ordem.id}
        clienteNome={clienteNome}
        catalogo={catalogo}
        itensIniciais={itens}
        open={listaMode !== null}
        mode={listaMode ?? "view"}
        onClose={() => setListaMode(null)}
        onSalvo={onAtualizado}
      />

      <OsAgendaSlotConflictModal
        draft={conflictDraft}
        onClose={() => setConflictDraft(null)}
        onPickSlot={onInstalacaoConflictPickSlot}
      />
    </div>
  );
}
