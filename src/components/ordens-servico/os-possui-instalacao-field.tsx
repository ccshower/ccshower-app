"use client";

import { useState } from "react";

import {
  defaultPossuiInstalacaoPorTipo,
  type ClientType,
} from "@/lib/clientes/tipo-cliente";
import { tClientType } from "@/lib/i18n";

type Props = {
  tipoCliente?: ClientType | null;
  initialChecked?: boolean;
  resetKey?: string;
};

export function OsPossuiInstalacaoField({
  tipoCliente,
  initialChecked,
  resetKey = "default",
}: Props) {
  const defaultChecked =
    initialChecked ??
    (tipoCliente ? defaultPossuiInstalacaoPorTipo(tipoCliente) : true);

  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div
      key={resetKey}
      className="rounded-ds-lg border border-cc-border bg-cc-border-light/40 px-3 py-3"
    >
      <input type="hidden" name="possui_instalacao" value={checked ? "true" : "false"} />
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-cc-border text-cc-blue focus:ring-cc-blue-focus"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-cc-ink">
            Installation will be performed by the company
          </span>
          <span className="mt-0.5 block text-xs font-light leading-relaxed text-cc-muted">
            Uncheck when installation is not part of this work order (e.g. builder
            or partner with their own team). The work order remains single, with optional
            stages.
          </span>
          {tipoCliente ? (
            <span className="mt-1.5 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cc-deep">
              Customer: {tClientType(tipoCliente)}
            </span>
          ) : null}
        </span>
      </label>
    </div>
  );
}
