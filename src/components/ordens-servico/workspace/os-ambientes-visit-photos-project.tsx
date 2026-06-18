"use client";

import { useMemo } from "react";

import { formatAmbienteValorDisplay } from "@/lib/ordens-servico/os-ambientes";
import { t } from "@/lib/i18n";
import type { OrdemServicoWithRelations, OsAnexoComUrl } from "@/lib/types/database";

function PhotoGrid({ anexos }: { anexos: OsAnexoComUrl[] }) {
  if (anexos.length === 0) return null;
  return (
    <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
      {anexos.map((a) => (
        <li key={a.id}>
          {a.url ? (
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-square overflow-hidden rounded-sm border border-cc-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={a.nome_arquivo}
                className="h-full w-full object-cover"
              />
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Read-only visit photos grouped by environment (project stage). */
export function OsAmbientesVisitPhotosProject({
  ordem,
}: {
  ordem: OrdemServicoWithRelations;
}) {
  const ambientes = ordem.ambientes ?? [];
  const anexos = ordem.anexos_visita ?? [];

  const anexosPorAmbiente = useMemo(() => {
    const map = new Map<string, OsAnexoComUrl[]>();
    for (const a of anexos) {
      if (!a.os_ambiente_id) continue;
      const list = map.get(a.os_ambiente_id) ?? [];
      list.push(a);
      map.set(a.os_ambiente_id, list);
    }
    return map;
  }, [anexos]);

  const anexosGerais = useMemo(
    () => anexos.filter((a) => !a.os_ambiente_id),
    [anexos],
  );

  if (anexos.length === 0) {
    return (
      <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
        <p className={sectionLabel}>{t("os.workspace.project.visitPhotosTitle")}</p>
        <p className="mt-2 text-sm text-cc-muted">
          {t("os.workspace.project.visitPhotosNone")}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-sm border border-cc-border/80 bg-cc-surface/30 p-3">
      <p className={sectionLabel}>{t("os.workspace.project.visitPhotosTitle")}</p>
      <p className="mt-1 text-xs font-light text-cc-muted">
        {t("os.workspace.project.visitPhotosHint")}
      </p>

      {ambientes.length > 0 ? (
        <ul className="mt-3 space-y-4">
          {ambientes.map((amb) => {
            const fotos = anexosPorAmbiente.get(amb.id) ?? [];
            return (
              <li key={amb.id} className="border-t border-cc-border pt-3 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-cc-ink">{amb.nome}</p>
                  {amb.valor_comercial != null && amb.valor_comercial > 0 ? (
                    <p className="text-xs tabular-nums text-cc-muted">
                      ${formatAmbienteValorDisplay(amb.valor_comercial)}
                    </p>
                  ) : null}
                </div>
                {amb.especificacoes?.trim() ? (
                  <p className="mt-1 whitespace-pre-wrap text-xs font-light text-cc-deep">
                    {amb.especificacoes}
                  </p>
                ) : null}
                {fotos.length > 0 ? (
                  <PhotoGrid anexos={fotos} />
                ) : (
                  <p className="mt-2 text-xs text-amber-700">
                    {t("os.ambientes.photosRequired")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {(ambientes.length === 0 || anexosGerais.length > 0) && (
        <div className={ambientes.length > 0 ? "mt-4 border-t border-cc-border pt-3" : "mt-3"}>
          {ambientes.length > 0 ? (
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
              {t("os.workspace.project.visitPhotosGeneral")}
            </p>
          ) : null}
          <PhotoGrid anexos={ambientes.length === 0 ? anexos : anexosGerais} />
        </div>
      )}
    </section>
  );
}

const sectionLabel =
  "text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted";
