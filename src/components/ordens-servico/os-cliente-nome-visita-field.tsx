"use client";

import { useTransition } from "react";

import { salvarNomeClienteVisitaComercial } from "@/app/ordens-servico/visita-comercial-actions";
import { t } from "@/lib/i18n";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus disabled:cursor-not-allowed disabled:bg-cc-border-light";

const labelClass =
  "block text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted";

type Props = {
  ordemId: string;
  value: string;
  nomeSalvo: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

/** Nome do cliente — editável somente na execução da visita comercial. */
export function OsClienteNomeVisitaField({
  ordemId,
  value,
  nomeSalvo,
  disabled = false,
  onChange,
  onSaved,
  onError,
}: Props) {
  const [pending, startTransition] = useTransition();

  function salvar(nextNome: string) {
    const trimmed = nextNome.trim();
    if (!trimmed || trimmed === nomeSalvo.trim()) return;

    startTransition(async () => {
      const r = await salvarNomeClienteVisitaComercial(ordemId, trimmed);
      if (!r.ok) {
        onError?.(r.message);
        return;
      }
      onSaved?.();
    });
  }

  return (
    <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
      <label htmlFor={`cliente-nome-visita-${ordemId}`} className={labelClass}>
        {t("os.visit.clientNameLabel")}
      </label>
      <input
        id={`cliente-nome-visita-${ordemId}`}
        type="text"
        disabled={disabled || pending}
        className={`mt-1.5 ${inputClass}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => salvar(value)}
        placeholder={t("os.visit.clientNamePlaceholder")}
        autoComplete="name"
      />
      <p className="mt-2 text-xs font-light text-cc-muted">
        {t("os.visit.clientNameHint")}
      </p>
    </section>
  );
}

/** Persiste nome antes de finalizar visita (se alterado). */
export async function persistirNomeClienteAntesFinalizarVisita(
  osId: string,
  nomeAtual: string,
  nomeSalvo: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = nomeAtual.trim();
  const saved = nomeSalvo.trim();
  if (!trimmed) {
    return { ok: false, message: "Customer name is required" };
  }
  if (trimmed === saved) return { ok: true };
  const r = await salvarNomeClienteVisitaComercial(osId, trimmed);
  if (!r.ok) return r;
  return { ok: true };
}
