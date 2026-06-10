"use client";

import {
  finalizeMoneyInputDisplay,
  maskMoneyInputChange,
} from "@/lib/ordens-servico/financial-workspace";
import { formatOsValorUsd } from "@/lib/ordens-servico/os-valores-etapa";

const sectionLabel =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-muted";

export const osMoneyInputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2 text-lg font-light tabular-nums text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

export const osMoneyInputClassCompact =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2 text-sm font-light tabular-nums text-cc-ink outline-none placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus";

type OsMoneyInputProps = {
  id?: string;
  value: string;
  disabled?: boolean;
  compact?: boolean;
  placeholder?: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
};

/** Input monetário USD — máscara en-US compartilhada em toda a OS. */
export function OsMoneyInput({
  id,
  value,
  disabled,
  compact = false,
  placeholder = "$0.00",
  onChange,
  onBlur,
}: OsMoneyInputProps) {
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      className={compact ? osMoneyInputClassCompact : osMoneyInputClass}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(maskMoneyInputChange(e.target.value))}
      onBlur={() => {
        const finalized = finalizeMoneyInputDisplay(value);
        if (finalized !== value) onChange(finalized);
        onBlur?.();
      }}
    />
  );
}

export function OsValorReadonlyRow({
  label,
  value,
}: {
  label: string;
  value: number | string | null | undefined;
}) {
  return (
    <div className="border-b border-cc-border/50 py-2.5 last:border-0">
      <p className={sectionLabel}>{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-cc-ink">
        {formatOsValorUsd(value)}
      </p>
    </div>
  );
}

export function OsValorEditableField({
  label,
  value,
  disabled,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (next: string) => void;
  onBlur?: () => void;
}) {
  return (
    <div>
      <label className={`block ${sectionLabel}`}>{label}</label>
      <div className="mt-1.5">
        <OsMoneyInput
          value={value}
          disabled={disabled}
          onChange={onChange}
          onBlur={onBlur}
        />
      </div>
    </div>
  );
}
