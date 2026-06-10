import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import type { OrdemServicoStatus } from "@/lib/types/database";

type TituloInput = {
  etapa_atual: string;
  status?: OrdemServicoStatus | string | null;
  clienteNome: string;
};

/** Título principal do card operacional — reflete a etapa atual, não o histórico da OS. */
export function tituloOperacionalCard({
  etapa_atual,
  status,
  clienteNome,
}: TituloInput): string {
  const nome = clienteNome.trim() || "Cliente";

  if (status === "completed" || status === "cancelled") {
    return status === "cancelled" ? `Cancelado — ${nome}` : `Concluído — ${nome}`;
  }

  switch (parseOsStage(etapa_atual)) {
    case "commercial":
      return `Primeiro atendimento — ${nome}`;
    case "financial_review":
      return `Financeiro — ${nome}`;
    case "project":
      return `Projeto — ${nome}`;
    case "installation":
      return `Instalação — ${nome}`;
    case "completed":
      return `Concluído — ${nome}`;
    case "blocked":
      return `Bloqueado — ${nome}`;
    default:
      return `Primeiro atendimento — ${nome}`;
  }
}
