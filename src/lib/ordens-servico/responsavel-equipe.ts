import type { Usuario } from "@/lib/types/database";

/** Valor do form: operação atribuída à equipe (sem pessoa fixa na OS). */
export const RESPONSAVEL_TODOS_EQUIPE = "__todos_equipe__";

export const EQUIPE_OPERACIONAL_LABEL = "Whole team";

/** Exibição auxiliar quando há responsável nomeado na OS (não obrigatório). */
export const RESPONSAVEL_AUX_NENHUM = "—";

/** @deprecated Use EQUIPE_OPERACIONAL_LABEL */
export const RESPONSAVEL_TODOS_LABEL = EQUIPE_OPERACIONAL_LABEL;

export function membrosDaEquipe(
  usuarios: Usuario[],
  equipeId: string | null | undefined,
): Usuario[] {
  if (!equipeId) return [];
  return usuarios
    .filter((u) => u.ativo && u.equipe_id === equipeId)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Converte select → responsavel_id na OS (null = operação da equipe). */
export function parseResponsavelIdFromForm(
  raw: FormDataEntryValue | null,
): string | null {
  const v = String(raw ?? "").trim();
  if (!v || v === RESPONSAVEL_TODOS_EQUIPE) return null;
  return v;
}

/** Valor inicial do select — padrão equipe inteira; só preenche se já existir na OS. */
export function initialResponsavelSelectValue(
  equipeId: string | null | undefined,
  usuarios: Usuario[],
  options?: {
    responsavelId?: string | null;
  },
): string {
  if (options?.responsavelId) {
    const membros = membrosDaEquipe(usuarios, equipeId);
    if (membros.some((m) => m.id === options.responsavelId)) {
      return options.responsavelId;
    }
  }
  return RESPONSAVEL_TODOS_EQUIPE;
}

/** Texto auxiliar em cards/resumo (não define operação). */
export function formatResponsavelAuxiliar(
  nome: string | null | undefined,
): string {
  if (!nome?.trim()) return RESPONSAVEL_AUX_NENHUM;
  return nome.trim();
}
