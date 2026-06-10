/** Fila Projeto — OS na etapa project (pendente ou em andamento). */

export type FilaProjetoItem = {
  osId: string;
  clienteId: string;
  clienteNome: string;
  equipeId: string | null;
  equipeNome: string | null;
  equipeCorPrimaria: string | null;
  statusAtual: string;
  criadoEm: string;
  atualizadoEm: string;
  temFornecedor: boolean;
  temDataMaterial: boolean;
  temCnc: boolean;
  temListaSeparacao: boolean;
  temInstalacaoAgendada: boolean;
};

export const filaProjetoStatusConfig: Record<
  "project_pending" | "project_in_progress" | "default",
  { label: string; dot: string; badge: string }
> = {
  project_pending: {
    label: "PENDING",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800",
  },
  project_in_progress: {
    label: "IN PROJECT",
    dot: "bg-violet-500",
    badge: "bg-violet-50 text-violet-800",
  },
  default: {
    label: "PROJECT",
    dot: "bg-cc-muted",
    badge: "bg-cc-canvas text-cc-muted",
  },
};

export function filaProjetoStatusBadge(statusAtual: string) {
  if (statusAtual === "project_pending") return filaProjetoStatusConfig.project_pending;
  if (statusAtual === "project_in_progress") return filaProjetoStatusConfig.project_in_progress;
  return filaProjetoStatusConfig.default;
}

export { formatDataCadastro } from "@/lib/centro-operacional/fila-comercial";
