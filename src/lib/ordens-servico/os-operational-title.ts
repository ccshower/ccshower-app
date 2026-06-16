import { t } from "@/lib/i18n";
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
  const nome = clienteNome.trim() || t("os.card.title.defaultCustomer");

  if (status === "completed" || status === "cancelled") {
    return status === "cancelled"
      ? t("os.card.title.cancelled", { name: nome })
      : t("os.card.title.completed", { name: nome });
  }

  switch (parseOsStage(etapa_atual)) {
    case "commercial":
      return t("os.card.title.firstVisit", { name: nome });
    case "financial_review":
      return t("os.card.title.financial", { name: nome });
    case "project":
      return t("os.card.title.project", { name: nome });
    case "installation":
      return t("os.card.title.installation", { name: nome });
    case "completed":
      return t("os.card.title.completed", { name: nome });
    case "blocked":
      return t("os.card.title.blocked", { name: nome });
    default:
      return t("os.card.title.firstVisit", { name: nome });
  }
}

/** Título padrão ao criar OS comercial para novo cliente. */
export function buildInitialCommercialOsTitulo(clienteNome: string): string {
  return tituloOperacionalCard({
    etapa_atual: "commercial",
    status: "open",
    clienteNome,
  });
}
