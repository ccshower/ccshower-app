"use client";

import { useMemo } from "react";

import { groupAnexosByAmbiente } from "@/lib/ordens-servico/os-ambientes";
import { t } from "@/lib/i18n";
import type { OsAmbiente, OsAnexoComUrl } from "@/lib/types/database";

type Props = {
  ambientes: OsAmbiente[];
  anexos: OsAnexoComUrl[];
  openLabel?: string;
  emptyLabel?: string;
  showEmptyAmbientes?: boolean;
};

function FileRow({ item, openLabel }: { item: OsAnexoComUrl; openLabel: string }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-sm border border-cc-border/70 bg-white px-2 py-1.5">
      <p className="min-w-0 truncate text-sm font-light text-cc-ink">{item.nome_arquivo}</p>
      {item.url ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-sm border border-cc-border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
        >
          {openLabel}
        </a>
      ) : null}
    </li>
  );
}

/** Lista de arquivos (CNC, etc.) agrupados por ambiente — somente leitura. */
export function OsAmbientesAnexosFileGrouped({
  ambientes,
  anexos,
  openLabel = t("os.workspace.project.cncOpen"),
  emptyLabel = t("os.workspace.project.cncNoneForAmbiente"),
  showEmptyAmbientes = false,
}: Props) {
  const { groups, orphans } = useMemo(
    () => groupAnexosByAmbiente(anexos, ambientes),
    [anexos, ambientes],
  );

  const generalLabel = t("os.workspace.project.cncGeneral");

  if (ambientes.length === 0) {
    if (anexos.length === 0) return null;
    return (
      <ul className="space-y-2">
        {anexos.map((item) => (
          <FileRow key={item.id} item={item} openLabel={openLabel} />
        ))}
      </ul>
    );
  }

  const visibleGroups = showEmptyAmbientes
    ? groups
    : groups.filter((g) => g.fotos.length > 0);

  return (
    <div className="space-y-3">
      {visibleGroups.map((group) => (
        <div key={group.ambienteId}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-cc-ink">{group.nome}</p>
            {group.fotos.length > 0 ? (
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-cc-muted">
                {t("os.workspace.project.cncFileCount", {
                  count: String(group.fotos.length),
                })}
              </p>
            ) : null}
          </div>
          {group.fotos.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {group.fotos.map((item) => (
                <FileRow key={item.id} item={item} openLabel={openLabel} />
              ))}
            </ul>
          ) : showEmptyAmbientes ? (
            <p className="mt-2 text-xs text-cc-muted">{emptyLabel}</p>
          ) : null}
        </div>
      ))}

      {orphans.length > 0 ? (
        <div className={visibleGroups.length > 0 ? "border-t border-cc-border pt-3" : undefined}>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
            {generalLabel}
          </p>
          <ul className="mt-2 space-y-2">
            {orphans.map((item) => (
              <FileRow key={item.id} item={item} openLabel={openLabel} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
