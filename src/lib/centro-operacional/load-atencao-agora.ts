import {
  isActiveCalendarAgendaStatus,
  operationalWallClockHm,
} from "@/lib/calendar/operational-calendar";
import {
  agendaEventoStartIso,
  AGENDA_EVENTO_DATETIME_COLUMNS,
} from "@/lib/ordens-servico/agenda-evento-query";
import { BLOQUEIO_STATUS_ATIVO } from "@/lib/ordens-servico/bloqueio-operacional";
import { parseFinancialDecision } from "@/lib/ordens-servico/financial-workspace";
import {
  labelOperationalStatus,
  parseOsOperationalStatus,
  parseOsStage,
} from "@/lib/ordens-servico/operacional-snapshot";
import { osWorkspacePath } from "@/lib/ordens-servico/os-routes";
import { OPERATIONAL_TZ } from "@/lib/ordens-servico/datetime";
import {
  hojeOperacionalYmd,
  isoRangeDiaOperacional,
} from "@/lib/ordens-servico/visita-slots";
import { tOsStage } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { Priority } from "@/lib/mock/centro-operacional/operational-dashboard";

import {
  ATENCAO_OS_DIAS_PARADO,
  ATENCAO_VISITA_NAO_CONFIRMADA_HORAS,
  buildAtencaoFilters,
  compareAtencaoItems,
  formatAbertoHa,
  formatOsRef,
  formatParadoHa,
  mapEtapaFluxoLabel,
  type AtencaoAgoraData,
  type AtencaoAgoraItem,
  type AtencaoSortMeta,
} from "./atencao-agora";

const OS_OPEN = new Set(["open", "scheduled", "in_progress"]);

type CrashRow = {
  id: string;
  ordem_servico_id: string;
  etapa: string;
  categoria: string;
  motivo: string;
  criado_em: string;
  ordens_servico: {
    id: string;
    ativo: boolean;
    status: string;
    clientes: { nome: string | null } | null;
    responsavel: { nome: string | null } | null;
  } | null;
};

type OsRow = {
  id: string;
  status: string;
  etapa_atual: string | null;
  status_atual: string | null;
  financial_decision: string | null;
  atualizado_em: string;
  clientes: { nome: string | null } | null;
};

type VisitaRow = {
  id: string;
  ordem_servico_id: string;
  status: string | null;
  data_inicio?: string | null;
  data_evento?: string | null;
  hora_evento?: string | null;
  clientes: { nome: string | null } | null;
  ordens_servico: { etapa_atual: string | null } | null;
};

type RawItem = AtencaoAgoraItem & AtencaoSortMeta;

function diasDesde(iso: string, nowMs: number): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((nowMs - t) / 86_400_000));
}

function eventDayYmd(startIso: string): string {
  return new Date(startIso).toLocaleDateString("en-CA", {
    timeZone: OPERATIONAL_TZ,
  });
}

function resolvePriority(dias: number, base: Priority = "urgente"): Priority {
  if (dias >= 5) return "critico";
  if (dias >= 2) return base === "normal" ? "urgente" : "critico";
  return base;
}

function buildCrashItems(rows: CrashRow[], nowMs: number): RawItem[] {
  const out: RawItem[] = [];

  for (const crash of rows) {
    const os = crash.ordens_servico;
    if (!os?.ativo || !OS_OPEN.has(os.status)) continue;

    const dias = diasDesde(crash.criado_em, nowMs);
    const cliente = os.clientes?.nome?.trim() || "Client";
    const resp = os.responsavel?.nome?.trim();

    out.push({
      id: `crash-${crash.id}`,
      osId: crash.ordem_servico_id,
      eventoId: null,
      href: osWorkspacePath(crash.ordem_servico_id),
      cliente,
      os: formatOsRef(crash.ordem_servico_id),
      etapa: mapEtapaFluxoLabel(crash.etapa),
      motivo: `${crash.categoria} — ${crash.motivo}`,
      priority: resolvePriority(dias, "critico"),
      type: "bloqueio",
      tempo: resp
        ? `${formatAbertoHa(dias)} · ${resp}`
        : formatAbertoHa(dias),
      acao: "Resolve block",
      sortGroup: 1,
      sortDias: dias,
    });
  }

  return out;
}

function motivoOsParada(os: OsRow, dias: number): string {
  const etapa = parseOsStage(os.etapa_atual);
  const status = parseOsOperationalStatus(os.status_atual);
  const etapaLabel = tOsStage(etapa);
  const statusLabel = labelOperationalStatus(os.status_atual);

  if (etapa === "blocked") {
    return `Flow blocked for ${formatParadoHa(dias)}`;
  }
  if (etapa === "financial_review") {
    const decision = parseFinancialDecision(os.financial_decision);
    if (decision === "pending") {
      return `${etapaLabel} awaiting approval for ${formatParadoHa(dias)}`;
    }
    if (decision === "rejected") {
      return `${etapaLabel} rejected for ${formatParadoHa(dias)}`;
    }
  }
  if (
    etapa === "project" &&
    (status === "project_pending" || status === "project_in_progress")
  ) {
    return `Project awaiting action for ${formatParadoHa(dias)}`;
  }
  if (etapa === "installation") {
    return `Installation — ${statusLabel.toLowerCase()} for ${formatParadoHa(dias)}`;
  }
  if (status === "no_visit") {
    return `Awaiting first visit for ${formatParadoHa(dias)}`;
  }

  return `${etapaLabel} — ${statusLabel.toLowerCase()} for ${formatParadoHa(dias)}`;
}

function buildOsAtrasadaItems(
  rows: OsRow[],
  crashOsIds: Set<string>,
  nowMs: number,
): RawItem[] {
  const out: RawItem[] = [];

  for (const os of rows) {
    if (!OS_OPEN.has(os.status)) continue;
    if (crashOsIds.has(os.id)) continue;

    const status = parseOsOperationalStatus(os.status_atual);
    const etapa = parseOsStage(os.etapa_atual);
    const limite =
      (ATENCAO_OS_DIAS_PARADO as Partial<Record<string, number>>)[status] ??
      (etapa === "blocked" ? 1 : undefined);

    if (limite == null) continue;

    const dias = diasDesde(os.atualizado_em, nowMs);
    if (dias < limite) continue;

    const cliente = os.clientes?.nome?.trim() || "Client";
    const priority =
      etapa === "blocked" || dias >= limite + 3
        ? "critico"
        : resolvePriority(dias, "urgente");

    out.push({
      id: `os-${os.id}-${status}`,
      osId: os.id,
      eventoId: null,
      href: osWorkspacePath(os.id),
      cliente,
      os: formatOsRef(os.id),
      etapa: mapEtapaFluxoLabel(os.etapa_atual),
      motivo: motivoOsParada(os, dias),
      priority,
      type: etapa === "blocked" ? "bloqueio" : "atrasada",
      tempo: formatParadoHa(dias),
      acao: etapa === "blocked" ? "Unblock flow" : "Advance OS",
      sortGroup: 2,
      sortDias: dias,
    });
  }

  return out;
}

function isVisitaExecutada(status: string | null | undefined): boolean {
  return (
    status === "on_site" ||
    status === "em_campo" ||
    status === "completed" ||
    status === "concluido"
  );
}

function buildVisitaItems(rows: VisitaRow[], nowMs: number): RawItem[] {
  const out: RawItem[] = [];
  const seenOs = new Set<string>();

  for (const ev of rows) {
    if (!isActiveCalendarAgendaStatus(ev.status)) continue;

    const startIso = agendaEventoStartIso(ev);
    if (!startIso) continue;

    const startMs = new Date(startIso).getTime();
    const osId = ev.ordem_servico_id;
    if (seenOs.has(osId)) continue;

    const cliente = ev.clientes?.nome?.trim() || "Client";
    const hora = operationalWallClockHm(startIso) ?? "—";
    const ymd = eventDayYmd(startIso);
    const href = osWorkspacePath(osId);
    const status = ev.status ?? "";

    if (startMs < nowMs && !isVisitaExecutada(status)) {
      seenOs.add(osId);
      const dias = diasDesde(startIso, nowMs);
      const perdida =
        status === "confirmed" ||
        status === "confirmado";
      out.push({
        id: `visita-${perdida ? "perdida" : "atrasada"}-${ev.id}`,
        osId,
        eventoId: ev.id,
        href,
        cliente,
        os: formatOsRef(osId),
        etapa: "Commercial",
        motivo: perdida
          ? `Missed visit — ${hora} with no field check-in`
          : `Overdue visit — ${hora} not executed`,
        priority: dias >= 1 ? "critico" : "urgente",
        type: "critica",
        tempo: dias <= 0 ? "Today" : formatAbertoHa(dias),
        acao: perdida ? "View visit" : "Reschedule visit",
        sortGroup: 3,
        sortDias: dias,
      });
      continue;
    }

    const horasAte = (startMs - nowMs) / 3_600_000;
    if (
      startMs > nowMs &&
      horasAte <= ATENCAO_VISITA_NAO_CONFIRMADA_HORAS &&
      (status === "scheduled" || status === "agendado")
    ) {
      seenOs.add(osId);
      out.push({
        id: `visita-pendente-${ev.id}`,
        osId,
        eventoId: ev.id,
        href,
        cliente,
        os: formatOsRef(osId),
        etapa: "Commercial",
        motivo: `Visit not confirmed — ${ymd} at ${hora}`,
        priority: horasAte <= 24 ? "urgente" : "normal",
        type: "critica",
        tempo: horasAte <= 24 ? "Next 24h" : "Next 48h",
        acao: "Confirm visit",
        sortGroup: 3,
        sortDias: 0,
      });
    }
  }

  return out;
}

function dedupeAndSort(items: RawItem[]): RawItem[] {
  const byKey = new Map<string, RawItem>();

  for (const item of items) {
    const key = item.osId
      ? `${item.type}-${item.osId}`
      : item.eventoId
        ? `${item.type}-${item.eventoId}`
        : item.id;
    const existing = byKey.get(key);
    if (!existing || compareAtencaoItems(item, existing) < 0) {
      byKey.set(key, item);
    }
  }

  return [...byKey.values()].sort(compareAtencaoItems);
}

export async function loadAtencaoAgora(
  unidadeId?: string | null,
): Promise<AtencaoAgoraData> {
  const nowMs = Date.now();
  const hoje = hojeOperacionalYmd();
  const rangePassado = isoRangeDiaOperacional(hoje);
  const rangeFuturo = rangePassado
    ? {
        start: rangePassado.start,
        end: new Date(
          new Date(rangePassado.end).getTime() +
            ATENCAO_VISITA_NAO_CONFIRMADA_HORAS * 3_600_000,
        ).toISOString(),
      }
    : null;

  const supabase = await createClient();

  let crashQuery = supabase
    .from("os_crashes")
    .select(
      `
      id,
      ordem_servico_id,
      etapa,
      categoria,
      motivo,
      criado_em,
      ordens_servico!inner (
        id,
        ativo,
        status,
        clientes!cliente_id ( nome ),
        responsavel:usuarios!responsavel_id ( nome )
      )
    `,
    )
    .eq("status", BLOQUEIO_STATUS_ATIVO);
  if (unidadeId) crashQuery = crashQuery.eq("ordens_servico.unidade_id", unidadeId);

  let osQuery = supabase
    .from("ordens_servico")
    .select(
      `
      id,
      status,
      etapa_atual,
      status_atual,
      financial_decision,
      atualizado_em,
      clientes!cliente_id ( nome )
    `,
    )
    .eq("ativo", true);
  if (unidadeId) osQuery = osQuery.eq("unidade_id", unidadeId);

  let visitasQuery =
    rangePassado && rangeFuturo
      ? supabase
          .from("agenda_eventos")
          .select(
            `
            ${AGENDA_EVENTO_DATETIME_COLUMNS},
            ordem_servico_id,
            clientes!cliente_id ( nome ),
            ordens_servico!ordem_servico_id ( etapa_atual )
          `,
          )
          .eq("tipo_evento", "technical_visit")
          .or(
            `and(data_inicio.gte.${rangePassado.start},data_inicio.lte.${rangeFuturo.end}),and(data_evento.gte.${rangePassado.start},data_evento.lte.${rangeFuturo.end})`,
          )
      : null;
  if (visitasQuery && unidadeId) {
    visitasQuery = visitasQuery.eq("unidade_id", unidadeId);
  }

  const [crashRes, osRes, visitasRes] = await Promise.all([
    crashQuery.order("criado_em", { ascending: true }),
    osQuery,
    visitasQuery ?? Promise.resolve({ data: [], error: null }),
  ]);

  const error =
    crashRes.error?.message ??
    osRes.error?.message ??
    visitasRes.error?.message ??
    null;

  if (error) {
    return {
      items: [],
      totalCount: 0,
      filters: buildAtencaoFilters([]),
      error,
    };
  }

  const crashRows = (crashRes.data ?? []) as CrashRow[];
  const osRows = (osRes.data ?? []) as OsRow[];
  const visitaRows = (visitasRes.data ?? []) as VisitaRow[];

  const crashOsIds = new Set(
    crashRows
      .map((c) => c.ordem_servico_id)
      .filter(Boolean),
  );

  const all = dedupeAndSort([
    ...buildCrashItems(crashRows, nowMs),
    ...buildOsAtrasadaItems(osRows, crashOsIds, nowMs),
    ...buildVisitaItems(visitaRows, nowMs),
  ]);

  const items = all.map(({ sortGroup: _g, sortDias: _d, ...item }) => item);

  return {
    items,
    totalCount: items.length,
    filters: buildAtencaoFilters(items),
    error: null,
  };
}
