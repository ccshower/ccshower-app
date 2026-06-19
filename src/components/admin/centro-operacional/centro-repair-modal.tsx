"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  abrirRepairOrdemServico,
  buscarClientesRepair,
  listarAmbientesRepair,
  listarEquipesInstalacaoRepair,
  listarOsRepairElegiveis,
  type ClienteRepairResumo,
} from "@/app/ordens-servico/repair-actions";
import { ClienteOsListPanel } from "@/components/clientes/cliente-os-list-panel";
import { OsVisitaAgendaPicker } from "@/components/ordens-servico/os-visita-agenda-picker";
import { OsMoneyInput } from "@/components/ordens-servico/os-valores-etapa-fields";
import { OperationalModal } from "@/components/operacional/operational-modal";
import { Field } from "@/components/ui/field";
import { t } from "@/lib/i18n";
import { osWorkspacePathWithUnidade } from "@/lib/unidades/centro-unidade-persist";
import type { ClienteOsResumo, Equipe } from "@/lib/types/database";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus";

type Step = "clientes" | "os" | "form";

type Props = {
  open: boolean;
  onClose: () => void;
  unidadeId: string | null;
};

export function CentroRepairModal({ open, onClose, unidadeId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("clientes");
  const [query, setQuery] = useState("");
  const [clientes, setClientes] = useState<ClienteRepairResumo[]>([]);
  const [clienteSel, setClienteSel] = useState<ClienteRepairResumo | null>(null);
  const [ordens, setOrdens] = useState<ClienteOsResumo[]>([]);
  const [osSel, setOsSel] = useState<ClienteOsResumo | null>(null);
  const [ambientes, setAmbientes] = useState<{ id: string; nome: string }[]>([]);
  const [ambienteId, setAmbienteId] = useState("");
  const [valor, setValor] = useState("");
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [equipeId, setEquipeId] = useState("");
  const [dataInst, setDataInst] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [searchPending, startSearch] = useTransition();
  const [submitPending, startSubmit] = useTransition();

  const reset = useCallback(() => {
    setStep("clientes");
    setQuery("");
    setClientes([]);
    setClienteSel(null);
    setOrdens([]);
    setOsSel(null);
    setAmbientes([]);
    setAmbienteId("");
    setValor("");
    setEquipeId("");
    setDataInst("");
    setHoraInicio("");
    setHoraFim("");
    setMsg(null);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    startSearch(async () => {
      const r = await buscarClientesRepair(query);
      if (r.error) setMsg(r.error);
      else {
        setMsg(null);
        setClientes(r.clientes);
      }
    });
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    void listarEquipesInstalacaoRepair().then((r) => {
      setEquipes(r.equipes);
      if (r.equipes.length === 1) setEquipeId(r.equipes[0]!.id);
    });
  }, [open]);

  function selecionarCliente(c: ClienteRepairResumo) {
    setMsg(null);
    setClienteSel(c);
    startSearch(async () => {
      const r = await listarOsRepairElegiveis(c.id);
      if (r.error) {
        setMsg(r.error);
        return;
      }
      if (r.ordens.length === 0) {
        setMsg(t("centro.repair.noEligibleOs"));
        return;
      }
      setOrdens(r.ordens);
      setStep("os");
    });
  }

  function selecionarOs(os: ClienteOsResumo) {
    setOsSel(os);
    setMsg(null);
    startSearch(async () => {
      const r = await listarAmbientesRepair(os.id);
      setAmbientes(r.ambientes);
      setAmbienteId("");
      setStep("form");
    });
  }

  function submit() {
    if (!osSel) return;
    startSubmit(async () => {
      setMsg(null);
      const r = await abrirRepairOrdemServico({
        osId: osSel.id,
        equipeId,
        dataInstalacao: dataInst,
        horaInstalacao: horaInicio,
        horaFimInstalacao: horaFim,
        valorSugerido: valor.trim() || undefined,
        osAmbienteId: ambienteId || null,
      });
      if (!r.ok) {
        setMsg(r.message);
        return;
      }
      onClose();
      router.push(osWorkspacePathWithUnidade(osSel.id, unidadeId));
    });
  }

  const busy = searchPending || submitPending;

  return (
    <OperationalModal
      open={open}
      onClose={onClose}
      title={t("centro.repair.modalTitle")}
      wide
    >
      <p className="mb-4 text-sm font-light text-cc-muted">
        {t("centro.repair.modalSubtitle")}
      </p>
      <div className="space-y-4">
        {step === "clientes" ? (
          <>
            <Field label={t("centro.repair.searchClient")}>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("centro.repair.searchPlaceholder")}
                className={inputClass}
              />
            </Field>
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {clientes.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => selecionarCliente(c)}
                    className="w-full rounded-sm border border-cc-border px-3 py-2.5 text-left text-sm hover:border-cc-blue-soft hover:bg-cc-canvas/60"
                  >
                    <p className="font-medium text-cc-ink">{c.nome}</p>
                    {c.endereco_formatado ? (
                      <p className="mt-0.5 text-xs text-cc-muted">{c.endereco_formatado}</p>
                    ) : null}
                  </button>
                </li>
              ))}
              {!searchPending && clientes.length === 0 ? (
                <li className="py-4 text-center text-sm text-cc-muted">
                  {t("centro.repair.noClients")}
                </li>
              ) : null}
            </ul>
          </>
        ) : null}

        {step === "os" && clienteSel ? (
          <>
            <button
              type="button"
              className="text-xs font-medium uppercase tracking-wide text-cc-muted hover:text-cc-ink"
              onClick={() => {
                setStep("clientes");
                setOsSel(null);
              }}
            >
              ← {clienteSel.nome}
            </button>
            <ClienteOsListPanel
              clienteNome={clienteSel.nome}
              ordens={ordens}
              onSelect={(id) => {
                const os = ordens.find((o) => o.id === id);
                if (os) selecionarOs(os);
              }}
            />
          </>
        ) : null}

        {step === "form" && osSel ? (
          <>
            <button
              type="button"
              className="text-xs font-medium uppercase tracking-wide text-cc-muted hover:text-cc-ink"
              onClick={() => setStep("os")}
            >
              ← {t("centro.repair.backToOs")}
            </button>

            {ambientes.length > 0 ? (
              <Field label={t("centro.repair.ambienteLabel")}>
                <select
                  value={ambienteId}
                  onChange={(e) => setAmbienteId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">{t("centro.repair.ambienteAll")}</option>
                  {ambientes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <Field label={t("centro.repair.valorLabel")}>
              <OsMoneyInput value={valor} onChange={setValor} disabled={busy} />
              <p className="mt-1 text-xs text-cc-muted">{t("centro.repair.valorHint")}</p>
            </Field>

            <Field label={t("os.workspace.project.installationTeamLabel")}>
              <select
                value={equipeId}
                onChange={(e) => {
                  setEquipeId(e.target.value);
                  setHoraInicio("");
                }}
                className={inputClass}
              >
                <option value="" disabled>
                  {t("os.workspace.project.installationTeamPlaceholder")}
                </option>
                {equipes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </Field>

            <OsVisitaAgendaPicker
              equipes={equipes}
              equipeId={equipeId}
              dataVisita={dataInst}
              horaVisita={horaInicio}
              horaFimVisita={horaFim}
              onDataChange={setDataInst}
              onHoraChange={setHoraInicio}
              onHoraFimChange={setHoraFim}
              fieldLabel={t("os.workspace.project.installationDateTimeLabel")}
            />

            <button
              type="button"
              disabled={
                busy ||
                !equipeId ||
                !dataInst ||
                !horaInicio ||
                !horaFim
              }
              onClick={submit}
              className="w-full rounded-sm bg-cc-ink py-3 text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-40"
            >
              {submitPending
                ? t("centro.repair.opening")
                : t("centro.repair.openRepair")}
            </button>
          </>
        ) : null}

        {msg ? (
          <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
            {msg}
          </p>
        ) : null}
      </div>
    </OperationalModal>
  );
}
