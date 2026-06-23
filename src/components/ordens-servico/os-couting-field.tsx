"use client";

import { t } from "@/lib/i18n";
import { coutingFromOrdem, tCoutingSim } from "@/lib/ordens-servico/os-couting";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted";

type CheckboxProps = {
  ordemId: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

export function OsCoutingCheckbox({
  ordemId,
  checked,
  disabled,
  onChange,
}: CheckboxProps) {
  return (
    <label
      htmlFor={`os-couting-${ordemId}`}
      className="flex cursor-pointer items-center gap-2.5"
    >
      <input
        id={`os-couting-${ordemId}`}
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded-sm border-cc-border text-cc-ink focus:ring-cc-blue-focus disabled:cursor-not-allowed"
      />
      <span className={`${labelClass} normal-case tracking-[0.06em] text-cc-ink`}>
        {t("os.couting.label")}
      </span>
    </label>
  );
}

export function OsCoutingReadonly({ ordem }: { ordem: OrdemServicoWithRelations }) {
  if (!coutingFromOrdem(ordem)) return null;

  return (
    <div className="rounded-sm border border-cc-border/80 bg-cc-surface/40 px-3 py-2.5">
      <p className={labelClass}>{t("os.couting.label")}</p>
      <p className="mt-1 text-sm font-medium text-cc-ink">{tCoutingSim()}</p>
    </div>
  );
}
