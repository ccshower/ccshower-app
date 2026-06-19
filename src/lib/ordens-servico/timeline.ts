import { agendaEventoStartIso } from "@/lib/ordens-servico/agenda-evento-query";
import { formatTimelineDateTime } from "@/lib/ordens-servico/datetime";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import { t, tEventType, tOsStage } from "@/lib/i18n";
import type {
  AgendaEventoTimeline,
  OrdemServicoWithRelations,
} from "@/lib/types/database";

export type TimelineEquipe = {
  id: string;
  nome: string;
  cor_primaria: string;
};

export type TimelineItem = {
  id: string;
  /** Ordenação — sempre criado_em do evento. */
  sortAt: string;
  titulo: string;
  contexto: string | null;
  registradoEm: string;
  dataVisita: string | null;
  equipe: TimelineEquipe | null;
  equipeLabel: string | null;
  tipoEvento: string;
};

export type TimelineBuildInput = {
  eventos: AgendaEventoTimeline[];
  viewerCanSeeFinancial?: boolean;
};

export type TimelineBuildOptions = {
  viewerCanSeeFinancial?: boolean;
};

/** Input da timeline — somente eventos persistidos (sem estado atual da OS). */
export function timelineBuildInputFromOrdem(
  ordem: OrdemServicoWithRelations,
  options?: TimelineBuildOptions,
): TimelineBuildInput {
  return {
    eventos: ordem.eventos ?? [],
    viewerCanSeeFinancial: options?.viewerCanSeeFinancial ?? false,
  };
}

export function formatTimelineEquipeLabel(
  nome: string | null | undefined,
): string | null {
  if (!nome?.trim()) return null;
  const n = nome.trim();
  if (/^equipe\s/i.test(n)) return n;
  return t("os.timeline.teamPrefix", { name: n });
}

function equipeFromEvent(ev: AgendaEventoTimeline): TimelineEquipe | null {
  if (!ev.equipe) return null;
  return {
    id: ev.equipe.id,
    nome: ev.equipe.nome,
    cor_primaria: ev.equipe.cor_primaria,
  };
}

function eventSortKey(ev: AgendaEventoTimeline): string {
  return ev.criado_em;
}

function eventRegistradoEm(ev: AgendaEventoTimeline): string {
  return ev.criado_em;
}

function isTechnicalOsTitle(title: string): boolean {
  return /^visit\s*[—-]/i.test(title.trim());
}

function contextoFromDescricao(desc: string | null | undefined): string | null {
  if (!desc?.trim()) return null;
  const trimmed = desc.trim();
  if (trimmed.includes("_") && !trimmed.includes(" ")) return null;
  if (isTechnicalOsTitle(trimmed)) return null;
  return trimmed;
}

function parseArrowTransition(desc: string): {
  from: string;
  to: string;
} | null {
  const trimmed = desc.trim().replace(/^\[admin\]\s*/i, "");
  const main = trimmed.split("—")[0]?.trim() ?? "";
  const parts = main.split("→").map((s) => s.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { from: parts[0], to: parts[1] };
}

function translateStageOrStatusKey(key: string): string {
  const stageLabel = tOsStage(key);
  if (stageLabel !== key) return stageLabel;
  return key;
}

function humanizeStageTransition(desc: string | null | undefined): string | null {
  if (!desc?.trim()) return null;
  const parsed = parseArrowTransition(desc);
  if (!parsed) return null;
  return `${translateStageOrStatusKey(parsed.from)} → ${translateStageOrStatusKey(parsed.to)}`;
}

function parseFinancialApprovedContext(desc: string | null | undefined): string | null {
  if (!desc?.trim()) return null;
  const trimmed = desc.trim();

  const labeled = trimmed.match(/valor\s+aprovado\s*:\s*(\$[\d,]+\.?\d*)/i);
  if (labeled) {
    return t("os.timeline.approvedAmount", { amount: labeled[1] });
  }

  const legacy = trimmed.match(/total\s+(\$[\d,]+\.?\d*)/i);
  if (legacy) {
    return t("os.timeline.approvedAmount", { amount: legacy[1] });
  }

  const amountOnly = trimmed.match(/\$[\d,]+\.?\d*/);
  if (amountOnly) {
    return t("os.timeline.approvedAmount", { amount: amountOnly[0] });
  }

  return null;
}

function parseFinancialRejectedContext(desc: string | null | undefined): string | null {
  if (!desc?.trim()) return null;
  const trimmed = desc.trim();
  const legacy = trimmed.match(/^financial_rejected\s*[—-]\s*(.+)$/i);
  if (legacy) return legacy[1].trim();
  return trimmed;
}

function visitTitulo(status: string): string {
  switch (status) {
    case "completed":
      return t("os.timeline.visitCompleted");
    case "on_site":
      return t("os.timeline.visitInProgress");
    case "cancelled":
      return t("os.timeline.visitCancelled");
    default:
      return t("os.timeline.visitScheduled");
  }
}

function dataVisitaFromEvent(ev: AgendaEventoTimeline): string | null {
  if (ev.tipo_evento !== "technical_visit" && ev.tipo_evento !== "installation") {
    return null;
  }
  const iso = agendaEventoStartIso(ev);
  if (!iso) return null;
  const formatted = formatTimelineDateTime(iso);
  return formatted === "—" ? null : formatted;
}

function applyFinancialVisibility(
  item: TimelineItem,
  canView: boolean,
): TimelineItem {
  if (canView) return item;

  if (item.tipoEvento === "financial_approved") {
    return {
      ...item,
      titulo: t("os.timeline.financialApprovedMasked"),
      contexto: null,
    };
  }

  if (item.tipoEvento === "financial_rejected") {
    return {
      ...item,
      titulo: t("os.timeline.financialRejectedMasked"),
      contexto: null,
    };
  }

  if (item.contexto && /\$[\d,]/.test(item.contexto)) {
    return { ...item, contexto: null };
  }

  return item;
}

function mapEvento(
  ev: AgendaEventoTimeline,
  viewerCanSeeFinancial: boolean,
): TimelineItem | null {
  if (ev.tipo_evento === "status_changed") return null;

  const tipo = ev.tipo_evento;
  const equipe = equipeFromEvent(ev);
  const equipeLabel = formatTimelineEquipeLabel(equipe?.nome);
  const sortAt = eventSortKey(ev);
  const registradoEm = eventRegistradoEm(ev);
  const dataVisita = dataVisitaFromEvent(ev);

  let titulo: string;
  let contexto: string | null = null;

  switch (tipo) {
    case "technical_visit":
      titulo = visitTitulo(ev.status);
      contexto = contextoFromDescricao(ev.descricao);
      break;
    case "os_created":
      titulo = t("os.timeline.osCreated");
      contexto = contextoFromDescricao(ev.descricao);
      break;
    case "stage_changed": {
      const transition = parseArrowTransition(ev.descricao ?? "");
      titulo = transition
        ? t("os.timeline.sentToStage", {
            stage: tOsStage(parseOsStage(transition.to)),
          })
        : t("os.timeline.sentToStage", {
            stage: tOsStage(parseOsStage(ev.etapa)),
          });
      contexto = humanizeStageTransition(ev.descricao);
      break;
    }
    case "financial_approved":
      titulo = t("os.timeline.financialApproved");
      contexto = parseFinancialApprovedContext(ev.descricao);
      break;
    case "financial_rejected":
      titulo = t("os.timeline.financialRejected");
      contexto = parseFinancialRejectedContext(ev.descricao);
      break;
    case "project_completed":
      titulo = t("os.timeline.projectCompleted");
      contexto = contextoFromDescricao(ev.descricao);
      break;
    case "installation_completed":
      titulo = t("os.timeline.installationCompleted");
      contexto = contextoFromDescricao(ev.descricao);
      break;
    case "repair_opened":
      titulo = t("os.timeline.repairOpened");
      contexto = contextoFromDescricao(ev.descricao);
      break;
    case "repair_completed":
      titulo = t("os.timeline.repairCompleted");
      contexto = contextoFromDescricao(ev.descricao);
      break;
    case "measurement":
      titulo = t("os.timeline.measurementDone");
      contexto = contextoFromDescricao(ev.descricao);
      break;
    case "installation":
      titulo =
        ev.status === "completed"
          ? t("os.timeline.installationCompleted")
          : t("os.timeline.installationScheduled");
      contexto = contextoFromDescricao(ev.descricao);
      break;
    default: {
      const fromType = tEventType(tipo);
      if (fromType !== tipo) {
        titulo = fromType;
      } else if (ev.titulo?.trim() && ev.titulo !== tipo) {
        const fromTitle = tEventType(ev.titulo);
        titulo = fromTitle !== ev.titulo ? fromTitle : ev.titulo.trim();
      } else {
        titulo = fromType;
      }
      contexto = contextoFromDescricao(ev.descricao);
    }
  }

  return applyFinancialVisibility(
    {
      id: ev.id,
      sortAt,
      titulo,
      contexto,
      registradoEm,
      dataVisita,
      equipe,
      equipeLabel,
      tipoEvento: tipo,
    },
    viewerCanSeeFinancial,
  );
}

function buildTimelineItems(input: TimelineBuildInput): TimelineItem[] {
  const canView = input.viewerCanSeeFinancial ?? false;

  return input.eventos
    .map((ev) => mapEvento(ev, canView))
    .filter((item): item is TimelineItem => item != null)
    .sort(
      (a, b) => new Date(a.sortAt).getTime() - new Date(b.sortAt).getTime(),
    );
}

/** Ordem cronológica — criado_em ASC. */
export function buildTimelineCronologica(input: TimelineBuildInput): TimelineItem[] {
  return buildTimelineItems(input);
}

/** Alias — mesma ordem cronológica. */
export function buildTimelineOperacional(input: TimelineBuildInput): TimelineItem[] {
  return buildTimelineCronologica(input);
}

/** Último evento registrado (maior criado_em). */
export function ultimoTimelineItem(input: TimelineBuildInput): TimelineItem | null {
  const itens = buildTimelineCronologica(input);
  return itens.length > 0 ? itens[itens.length - 1]! : null;
}
