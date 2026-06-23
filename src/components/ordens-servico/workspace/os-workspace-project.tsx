"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  finalizarProjeto,
  listarCatalogoItens,
  listarFornecedores,
  salvarDataPrevistaMaterial,
  salvarFornecedorProjeto,
  salvarObservacoesInstalacao,
  salvarValorProjeto,
} from "@/app/ordens-servico/projeto-actions";
import { OsDescontoResumo } from "@/components/ordens-servico/os-desconto-resumo";
import {
  OsValorEditableField,
  OsValorReadonlyRow,
} from "@/components/ordens-servico/os-valores-etapa-fields";
import { Field } from "@/components/ui/field";
import { initialValorProjetoInput } from "@/lib/ordens-servico/os-valores-etapa";
import {
  osTemRetornoInstalacaoParcial,
  resumoRetornoInstalacaoParcial,
} from "@/lib/ordens-servico/os-ambiente-instalacao";
import { OsAmbientesCncProjectPanel } from "@/components/ordens-servico/workspace/os-ambientes-cnc-project-panel";
import { OsAmbientesVisitPhotosProject } from "@/components/ordens-servico/workspace/os-ambientes-visit-photos-project";
import { OsSeparationListProjectPanel } from "@/components/ordens-servico/workspace/os-separation-list-project-panel";
import { OsSeparationListModal } from "@/components/ordens-servico/workspace/os-separation-list-modal";
import { hojeOperacionalYmd, compararYmd } from "@/lib/ordens-servico/visita-slots";
import { t } from "@/lib/i18n";
import type {
  CatalogoItem,
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
  fluxoBloqueado?: boolean;
  onAtualizado: () => void;
  onConcluido: () => void;
};

/** Parte 1 — Projeto técnico: desenho, pedido de vidro, previsão e observações. */
export function OsWorkspaceProject({
  ordem,
  fluxoBloqueado = false,
  onAtualizado,
  onConcluido,
}: Props) {
  const [valorProjeto, setValorProjeto] = useState(initialValorProjetoInput(ordem));
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
  const [installationNotes, setInstallationNotes] = useState(
    ordem.installation_notes ?? "",
  );
  const [notesStatus, setNotesStatus] = useState<NotesSaveStatus>("idle");
  const [listaMode, setListaMode] = useState<"view" | "edit" | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [valorPending, startValorTransition] = useTransition();
  const [finalizePending, startFinalizeTransition] = useTransition();
  const [fornecedorPending, startFornecedorTransition] = useTransition();
  const [materialPending, startMaterialTransition] = useTransition();
  const savedNotesRef = useRef(ordem.installation_notes ?? "");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAtualizadoRef = useRef(onAtualizado);

  useEffect(() => {
    onAtualizadoRef.current = onAtualizado;
  }, [onAtualizado]);

  const itens = ordem.lista_separacao ?? [];
  const clienteNome = ordem.cliente?.nome ?? ordem.titulo;

  useEffect(() => {
    setValorProjeto(initialValorProjetoInput(ordem));
    setFornecedorId(ordem.fornecedor_id ?? "");
    setDataPrevistaMaterial(ordem.data_prevista_material?.slice(0, 10) ?? "");
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
    ordem.id,
  ]);

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

  useEffect(() => {
    void carregarCatalogo();
    void carregarFornecedores();
  }, [carregarCatalogo, carregarFornecedores]);

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

  const busy =
    valorPending ||
    finalizePending ||
    notesStatus === "saving" ||
    fornecedorPending ||
    materialPending;

  const retornoParcialInstalacao = osTemRetornoInstalacaoParcial(ordem.ambientes ?? []);
  const resumoRetornoParcial = resumoRetornoInstalacaoParcial(ordem.ambientes ?? []);

  return (
    <div className="space-y-4">
      <OsDescontoResumo ordem={ordem} />

      {retornoParcialInstalacao && resumoRetornoParcial ? (
        <div className="rounded-sm border-2 border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-red-800">
            {t("os.workspace.project.partialInstallReturnTitle")}
          </p>
          <p className="mt-1">{t("os.workspace.project.partialInstallReturnHint")}</p>
          <ul className="mt-2 space-y-1 text-xs">
            {resumoRetornoParcial.instalados.map((nome) => (
              <li key={nome} className="flex items-center gap-2 text-emerald-900">
                <span className="font-semibold uppercase tracking-wide">
                  {t("os.workspace.project.ambienteInstalado")}:
                </span>
                {nome}
              </li>
            ))}
            {resumoRetornoParcial.bloqueados.map((b) => (
              <li key={b.nome} className="text-amber-900">
                <span className="font-semibold uppercase tracking-wide">
                  {t("os.workspace.installation.ambienteStatus.blocked")}:
                </span>{" "}
                {b.nome}
                {b.motivo ? ` — ${b.motivo}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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

      <OsAmbientesVisitPhotosProject ordem={ordem} />

      <OsAmbientesCncProjectPanel
        ordem={ordem}
        disabled={busy}
        onAtualizado={onAtualizado}
        onMessage={setMsg}
      />

      <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
        <p className={sectionLabel}>{t("os.workspace.project.glassOrderTitle")}</p>
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

      <OsSeparationListProjectPanel
        ordem={ordem}
        itens={itens}
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
    </div>
  );
}
