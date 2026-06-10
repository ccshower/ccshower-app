"use client";



import { useMemo, useState, useTransition } from "react";



import { registrarBloqueioOperacional } from "@/app/ordens-servico/bloqueio-operacional-actions";

import { OperationalModal } from "@/components/operacional/operational-modal";

import { Field } from "@/components/ui/field";

import { t, tOsStage } from "@/lib/i18n";

import {

  BLOQUEIO_OPCOES_POR_ETAPA,

  categoriasBloqueioParaEtapa,

  isBloqueioOperacionalEtapa,

  motivosBloqueioParaEtapaCategoria,

  type BloqueioOperacionalEtapa,

} from "@/lib/ordens-servico/bloqueio-operacional";

import { isOsFluxoBloqueado } from "@/lib/ordens-servico/os-bloqueio-fluxo";

import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";

import type { OrdemServicoWithRelations } from "@/lib/types/database";



type Props = {

  ordem: OrdemServicoWithRelations;

  onAtualizado: () => void;

};



/** Registro de bloqueio na coluna lateral (somente quando não há bloqueio ativo). */

export function OsWorkspaceBloqueioOperacional({ ordem, onAtualizado }: Props) {

  const etapaRaw = parseOsStage(ordem.etapa_atual);

  const etapaBloqueio: BloqueioOperacionalEtapa | null = isBloqueioOperacionalEtapa(

    etapaRaw,

  )

    ? etapaRaw

    : null;



  const fluxoBloqueado = isOsFluxoBloqueado(ordem);

  const [modalOpen, setModalOpen] = useState(false);

  const [categoria, setCategoria] = useState("");

  const [motivo, setMotivo] = useState("");

  const [observacao, setObservacao] = useState("");

  const [error, setError] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();



  const categorias = useMemo(

    () => (etapaBloqueio ? categoriasBloqueioParaEtapa(etapaBloqueio) : []),

    [etapaBloqueio],

  );



  const motivos = useMemo(

    () =>

      etapaBloqueio && categoria

        ? motivosBloqueioParaEtapaCategoria(etapaBloqueio, categoria)

        : [],

    [etapaBloqueio, categoria],

  );



  const podeRegistrar =

    etapaBloqueio != null &&

    ordem.status !== "completed" &&

    ordem.status !== "cancelled";



  function abrirModal() {

    setError(null);

    const opcoes = etapaBloqueio ? BLOQUEIO_OPCOES_POR_ETAPA[etapaBloqueio] : [];

    const primeira = opcoes[0];

    setCategoria(primeira?.categoria ?? "");

    setMotivo(primeira?.motivos[0] ?? "");

    setObservacao("");

    setModalOpen(true);

  }



  function fecharModal() {

    if (pending) return;

    setModalOpen(false);

    setError(null);

  }



  if (fluxoBloqueado) return null;

  function submitRegistrar(e: React.FormEvent) {

    e.preventDefault();

    if (!etapaBloqueio) return;



    const fd = new FormData();

    fd.set("ordem_servico_id", ordem.id);

    fd.set("categoria", categoria);

    fd.set("motivo", motivo);

    if (observacao.trim()) fd.set("observacao", observacao.trim());



    startTransition(async () => {

      setError(null);

      const result = await registrarBloqueioOperacional(fd);

      if (!result.ok) {

        setError(result.message);

        return;

      }

      setModalOpen(false);

      onAtualizado();

    });

  }



  return (

    <>

      <section className="rounded-ds-lg border border-cc-border/70 bg-cc-surface px-3 py-3">

        <h2 className="text-sm font-medium text-cc-ink">{t("os.bloqueio.title")}</h2>

        <div className="mt-2">

          <p className="text-sm font-light text-cc-muted">{t("os.bloqueio.noneActive")}</p>

          {podeRegistrar ? (

            <button

              type="button"

              onClick={abrirModal}

              className="mt-3 w-full rounded-sm bg-cc-ink px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-cc-deep"

            >

              {t("os.bloqueio.register")}

            </button>

          ) : (

            <p className="mt-2 text-[11px] font-light text-cc-subtle">

              {t("os.bloqueio.registerUnavailable")}

            </p>

          )}

        </div>

      </section>



      <OperationalModal

        open={modalOpen}

        title={t("os.bloqueio.modalTitle")}

        onClose={fecharModal}

      >

        <form onSubmit={submitRegistrar} className="space-y-4">

          <Field label={t("os.bloqueio.fieldStage")}>

            <input

              type="text"

              readOnly

              value={etapaBloqueio ? tOsStage(etapaBloqueio) : "—"}

              className="w-full rounded-sm border border-cc-border bg-cc-border-light/50 px-3 py-2 text-sm font-light text-cc-muted"

            />

          </Field>



          <Field label={t("os.bloqueio.fieldCategory")}>

            <select

              required

              value={categoria}

              onChange={(e) => {

                const next = e.target.value;

                setCategoria(next);

                const lista =

                  etapaBloqueio && next

                    ? motivosBloqueioParaEtapaCategoria(etapaBloqueio, next)

                    : [];

                setMotivo(lista[0] ?? "");

              }}

              className="w-full rounded-sm border border-cc-border bg-white px-3 py-2 text-sm font-light text-cc-ink"

            >

              {categorias.map((c) => (

                <option key={c} value={c}>

                  {c}

                </option>

              ))}

            </select>

          </Field>



          <Field label={t("os.bloqueio.fieldReason")}>

            <select

              required

              value={motivo}

              onChange={(e) => setMotivo(e.target.value)}

              className="w-full rounded-sm border border-cc-border bg-white px-3 py-2 text-sm font-light text-cc-ink"

            >

              {motivos.map((m) => (

                <option key={m} value={m}>

                  {m}

                </option>

              ))}

            </select>

          </Field>



          <Field label={t("os.bloqueio.fieldNotes")}>

            <textarea

              value={observacao}

              onChange={(e) => setObservacao(e.target.value)}

              rows={3}

              className="w-full resize-y rounded-sm border border-cc-border bg-white px-3 py-2 text-sm font-light text-cc-ink"

              placeholder={t("os.bloqueio.notesPlaceholder")}

            />

          </Field>



          {error ? (

            <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">

              {error}

            </p>

          ) : null}



          <div className="flex flex-wrap justify-end gap-2">

            <button

              type="button"

              onClick={fecharModal}

              disabled={pending}

              className="rounded-sm border border-cc-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted hover:bg-cc-border-light disabled:opacity-50"

            >

              {t("os.bloqueio.cancel")}

            </button>

            <button

              type="submit"

              disabled={pending || !categoria || !motivo}

              className="rounded-sm bg-cc-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:bg-cc-deep disabled:opacity-50"

            >

              {pending ? t("os.bloqueio.saving") : t("os.bloqueio.submit")}

            </button>

          </div>

        </form>

      </OperationalModal>

    </>

  );

}

