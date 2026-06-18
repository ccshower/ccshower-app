"use client";

import { CENTRO_UNIDADE_COOKIE } from "@/lib/unidades/centro-unidade-persist";

const MAX_AGE_SEC = 60 * 60 * 24 * 365;

/** Mantém a unidade escolhida no Centro ao navegar para OS e voltar. */
export function persistCentroUnidadeCookie(unidadeId: string | null): void {
  if (typeof document === "undefined") return;
  if (unidadeId) {
    document.cookie = `${CENTRO_UNIDADE_COOKIE}=${encodeURIComponent(unidadeId)}; path=/; max-age=${MAX_AGE_SEC}; SameSite=Lax`;
  } else {
    document.cookie = `${CENTRO_UNIDADE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}
