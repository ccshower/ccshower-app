"use client";

import { useMemo } from "react";

import {
  flattenVisitPhotosForPreview,
  formatAmbienteValorDisplay,
  groupVisitPhotosByAmbiente,
  type VisitPhotoPreviewItem,
} from "@/lib/ordens-servico/os-ambientes";
import {
  ambienteInstalacaoFromRow,
  isAmbienteInstalacaoBloqueado,
  isAmbienteInstalacaoConcluido,
  osTemRetornoInstalacaoParcial,
} from "@/lib/ordens-servico/os-ambiente-instalacao";
import { t } from "@/lib/i18n";
import type { OsAmbiente, OsAnexoComUrl } from "@/lib/types/database";

type Props = {
  ambientes: OsAmbiente[];
  anexos: OsAnexoComUrl[];
  /** context: abre preview; project: link nova aba */
  variant: "buttons" | "links";
  onPhotoClick?: (item: VisitPhotoPreviewItem, flatIndex: number) => void;
  /** project: exibe ambientes mesmo sem foto */
  showEmptyAmbientes?: boolean;
};

function PhotoThumb({
  anexo,
  variant,
  ambienteNome,
  onClick,
}: {
  anexo: OsAnexoComUrl;
  variant: "buttons" | "links";
  ambienteNome?: string | null;
  onClick?: () => void;
}) {
  const inner = anexo.url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={anexo.url} alt={anexo.nome_arquivo} className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full items-center justify-center px-1 text-center text-[9px] text-cc-muted">
      {anexo.nome_arquivo}
    </div>
  );

  const shell = (
    <div className="relative aspect-square overflow-hidden rounded-sm border border-cc-border bg-white">
      {inner}
      {ambienteNome ? (
        <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[9px] font-medium text-white">
          {ambienteNome}
        </span>
      ) : null}
    </div>
  );

  if (variant === "links" && anexo.url) {
    return (
      <a
        href={anexo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        title={ambienteNome ? `${ambienteNome} — ${anexo.nome_arquivo}` : anexo.nome_arquivo}
      >
        {shell}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left"
      title={ambienteNome ? `${ambienteNome} — ${anexo.nome_arquivo}` : anexo.nome_arquivo}
      aria-label={t("os.workspace.contextOpenPhoto")}
    >
      {shell}
    </button>
  );
}

export function useVisitPhotosGrouped(
  anexos: OsAnexoComUrl[],
  ambientes: OsAmbiente[],
) {
  return useMemo(() => {
    const { groups, orphans } = groupVisitPhotosByAmbiente(anexos, ambientes);
    const generalLabel = t("os.workspace.project.visitPhotosGeneral");
    const flat = flattenVisitPhotosForPreview(groups, orphans, generalLabel);
    return { groups, orphans, flat, generalLabel };
  }, [anexos, ambientes]);
}

/** Fotos da visita agrupadas por ambiente (contexto, projeto, etc.). */
export function OsAmbientesPhotosGrouped({
  ambientes,
  anexos,
  variant,
  onPhotoClick,
  showEmptyAmbientes = false,
}: Props) {
  const { groups, orphans, flat, generalLabel } = useVisitPhotosGrouped(anexos, ambientes);

  const flatIndexById = useMemo(() => {
    const map = new Map<string, number>();
    flat.forEach((item, index) => map.set(item.id, index));
    return map;
  }, [flat]);

  const hasAmbientes = ambientes.length > 0;
  const retornoParcial = osTemRetornoInstalacaoParcial(ambientes);
  const visibleGroups = showEmptyAmbientes
    ? groups
    : groups.filter((g) => g.fotos.length > 0);

  if (!hasAmbientes) {
    if (anexos.length === 0) return null;
    return (
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {anexos.map((a) => (
          <li key={a.id}>
            <PhotoThumb
              anexo={a}
              variant={variant}
              onClick={
                onPhotoClick
                  ? () => {
                      const idx = flatIndexById.get(a.id) ?? 0;
                      onPhotoClick(flat[idx] ?? { ...a, ambienteId: null, ambienteNome: null }, idx);
                    }
                  : undefined
              }
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-3">
      {visibleGroups.map((group) => {
        const amb = ambientes.find((a) => a.id === group.ambienteId);
        const concluido = amb ? isAmbienteInstalacaoConcluido(amb) : false;
        const bloqueado = amb ? isAmbienteInstalacaoBloqueado(amb) : false;
        const instalacao = amb ? ambienteInstalacaoFromRow(amb) : null;

        return (
        <div key={group.ambienteId}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-cc-ink">{group.nome}</p>
            <div className="flex flex-wrap items-center gap-2">
              {retornoParcial && concluido ? (
                <span className="rounded-ds bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                  {t("os.workspace.project.ambienteInstalado")}
                </span>
              ) : null}
              {retornoParcial && bloqueado ? (
                <span className="rounded-ds bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                  {t("os.workspace.installation.ambienteStatus.blocked")}
                </span>
              ) : null}
              {group.valor_comercial != null && group.valor_comercial > 0 ? (
                <p className="text-xs tabular-nums text-cc-muted">
                  ${formatAmbienteValorDisplay(group.valor_comercial)}
                </p>
              ) : null}
              {group.fotos.length > 0 ? (
                <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-cc-muted">
                  {t("os.ambientes.photoCount", { count: String(group.fotos.length) })}
                </p>
              ) : null}
            </div>
          </div>
          {bloqueado && instalacao?.bloqueio_motivo ? (
            <p className="mt-1 text-xs text-amber-800">
              {instalacao.bloqueio_categoria}: {instalacao.bloqueio_motivo}
            </p>
          ) : null}
          {group.especificacoes?.trim() ? (
            <p className="mt-1 whitespace-pre-wrap text-xs font-light text-cc-deep">
              {group.especificacoes}
            </p>
          ) : null}
          {group.fotos.length > 0 ? (
            <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {group.fotos.map((a) => (
                <li key={a.id}>
                  <PhotoThumb
                    anexo={a}
                    variant={variant}
                    onClick={
                      onPhotoClick
                        ? () => {
                            const idx = flatIndexById.get(a.id) ?? 0;
                            onPhotoClick(
                              flat[idx] ?? {
                                ...a,
                                ambienteId: group.ambienteId,
                                ambienteNome: group.nome,
                              },
                              idx,
                            );
                          }
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          ) : showEmptyAmbientes ? (
            <p
              className={`mt-2 text-xs ${
                concluido ? "text-cc-muted" : "text-amber-700"
              }`}
            >
              {concluido
                ? t("os.workspace.project.ambienteInstaladoVisitPhotos")
                : t("os.ambientes.photosRequired")}
            </p>
          ) : null}
        </div>
        );
      })}

      {orphans.length > 0 ? (
        <div className={visibleGroups.length > 0 ? "border-t border-cc-border pt-3" : undefined}>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-muted">
            {generalLabel}
          </p>
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {orphans.map((a) => (
              <li key={a.id}>
                <PhotoThumb
                  anexo={a}
                  variant={variant}
                  ambienteNome={generalLabel}
                  onClick={
                    onPhotoClick
                      ? () => {
                          const idx = flatIndexById.get(a.id) ?? 0;
                          onPhotoClick(
                            flat[idx] ?? { ...a, ambienteId: null, ambienteNome: generalLabel },
                            idx,
                          );
                        }
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
