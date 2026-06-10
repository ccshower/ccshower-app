import {
  isActiveCalendarAgendaStatus,
  mondayOfOperationalWeek,
  weekBoundsIso,
} from "@/lib/calendar/operational-calendar";
import {
  agendaEventoStartIso,
  AGENDA_EVENTO_DATETIME_COLUMNS,
} from "@/lib/ordens-servico/agenda-evento-query";
import { BLOQUEIO_STATUS_ATIVO } from "@/lib/ordens-servico/bloqueio-operacional";
import { isOsNaFilaProjeto } from "@/lib/ordens-servico/fila-projeto-query";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import { createClient } from "@/lib/supabase/server";

import {
  calcOcupacaoPercentual,
  CAPACIDADE_DEPARTAMENTO_LABEL,
  CAPACIDADE_DEPARTAMENTO_ORDER,
  CAPACIDADE_EVENTOS_POR_CODIGO,
  CAPACIDADE_METRICA_AGENDADOS,
  CAPACIDADE_OPERACIONAL_VAZIO,
  CAPACIDADE_SEMANAL_POR_CODIGO,
  type CapacidadeDepartamento,
  type CapacidadeOperacionalData,
  type EquipeCapacidade,
  resolveCapacidadeStatus,
} from "./capacidade-operacional";

const OS_OPEN = new Set(["open", "scheduled", "in_progress"]);

type EquipeRow = {
  id: string;
  nome: string;
  codigo_operacional: string | null;
  cor_primaria: string;
  ativo: boolean;
};

type AgendaRow = {
  equipe_id: string | null;
  tipo_evento: string;
  status?: string | null;
  data_evento?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  hora_evento?: string | null;
};

type OsRow = {
  id: string;
  status: string;
  equipe_id: string | null;
  equipe_atual_id: string | null;
  etapa_atual: string | null;
  status_atual: string | null;
};

type CrashRow = {
  ordem_servico_id: string;
  ordens_servico: {
    id: string;
    ativo: boolean;
    status: string;
    equipe_id: string | null;
    equipe_atual_id: string | null;
  } | null;
};

function resolveCodigoOperacional(equipe: EquipeRow): string | null {
  const code = equipe.codigo_operacional?.trim();
  if (code && CAPACIDADE_SEMANAL_POR_CODIGO[code]) return code;

  const nome = equipe.nome.toLowerCase();
  if (nome.includes("comercial") || nome.includes("commercial")) return "commercial";
  if (nome.includes("instala")) return "installation";
  if (nome.includes("projeto") || nome.includes("project")) return "project";

  return null;
}

function equipeResponsavelId(
  equipeId: string | null | undefined,
  equipeAtualId: string | null | undefined,
): string | null {
  return equipeAtualId ?? equipeId ?? null;
}

function eventoNaSemana(startIso: string, weekStartMs: number, weekEndMs: number): boolean {
  const t = new Date(startIso).getTime();
  return t >= weekStartMs && t < weekEndMs;
}

function isPendenciaOs(os: OsRow, codigo: string): boolean {
  if (!OS_OPEN.has(os.status)) return false;
  const etapa = parseOsStage(os.etapa_atual);
  if (codigo === "commercial") {
    return etapa === "commercial" && (os.status_atual === "no_visit" || os.status_atual === "commercial_pending");
  }
  if (codigo === "project") {
    return isOsNaFilaProjeto(os);
  }
  if (codigo === "installation") {
    return (
      etapa === "installation" &&
      (os.status_atual === "installation_pending" ||
        os.status_atual === "installation_scheduled")
    );
  }
  return false;
}

function buildDepartamentos(
  equipes: EquipeRow[],
  agendaRows: AgendaRow[],
  osRows: OsRow[],
  crashRows: CrashRow[],
  weekStartMs: number,
  weekEndMs: number,
): CapacidadeDepartamento[] {
  const equipesComCodigo = equipes
    .map((eq) => ({ eq, codigo: resolveCodigoOperacional(eq) }))
    .filter(
      (row): row is { eq: EquipeRow; codigo: string } =>
        row.codigo != null && Boolean(CAPACIDADE_SEMANAL_POR_CODIGO[row.codigo]),
    );

  const equipeCapacidades: EquipeCapacidade[] = [];

  for (const { eq, codigo } of equipesComCodigo) {
    const tiposEvento = new Set(CAPACIDADE_EVENTOS_POR_CODIGO[codigo] ?? []);
    const capacidadeSemanal = CAPACIDADE_SEMANAL_POR_CODIGO[codigo] ?? 40;

    let eventosAgendados = 0;
    for (const ev of agendaRows) {
      if (ev.equipe_id !== eq.id) continue;
      if (!tiposEvento.has(ev.tipo_evento)) continue;
      if (!isActiveCalendarAgendaStatus(ev.status)) continue;
      const startIso = agendaEventoStartIso(ev);
      if (!startIso) continue;
      if (!eventoNaSemana(startIso, weekStartMs, weekEndMs)) continue;
      eventosAgendados += 1;
    }

    let pendencias = 0;
    for (const os of osRows) {
      if (equipeResponsavelId(os.equipe_atual_id, os.equipe_id) !== eq.id) continue;
      if (isPendenciaOs(os, codigo)) pendencias += 1;
    }

    const bloqueioOsIds = new Set<string>();
    for (const crash of crashRows) {
      const os = crash.ordens_servico;
      if (!os?.ativo || !OS_OPEN.has(os.status)) continue;
      if (equipeResponsavelId(os.equipe_atual_id, os.equipe_id) !== eq.id) continue;
      bloqueioOsIds.add(os.id);
    }
    const bloqueiosAtivos = bloqueioOsIds.size;

    const ocupacaoPercentual = calcOcupacaoPercentual(
      eventosAgendados,
      capacidadeSemanal,
    );
    const status = resolveCapacidadeStatus(ocupacaoPercentual);
    const departamento = CAPACIDADE_DEPARTAMENTO_LABEL[codigo] ?? codigo;

    const metricas = [
      {
        label: CAPACIDADE_METRICA_AGENDADOS[codigo] ?? "compromissos agendados",
        value: eventosAgendados,
      },
      ...(bloqueiosAtivos > 0
        ? [{ label: "bloqueios ativos", value: bloqueiosAtivos }]
        : []),
      ...(pendencias > 0 ? [{ label: "pendências", value: pendencias }] : []),
    ];

    equipeCapacidades.push({
      id: eq.id,
      departamento,
      nome: eq.nome,
      corPrimaria: eq.cor_primaria,
      status,
      detalhe: {
        ocupacaoPercentual,
        metricas,
      },
    });
  }

  for (const cap of equipeCapacidades) {
    if (cap.status !== "sobrecarregado") continue;
    const codigo =
      CAPACIDADE_DEPARTAMENTO_ORDER.find(
        (c) => CAPACIDADE_DEPARTAMENTO_LABEL[c] === cap.departamento,
      ) ?? null;
    if (!codigo) continue;

    const alternativa = equipeCapacidades.find(
      (other) =>
        other.id !== cap.id &&
        other.departamento === cap.departamento &&
        other.status === "saudavel",
    );
    if (alternativa) {
      cap.detalhe.sugestao = `Considere redistribuir carga para ${alternativa.nome}`;
    }
  }

  const departamentos: CapacidadeDepartamento[] = [];
  for (const codigo of CAPACIDADE_DEPARTAMENTO_ORDER) {
    const label = CAPACIDADE_DEPARTAMENTO_LABEL[codigo];
    const equipesDept = equipeCapacidades
      .filter((e) => e.departamento === label)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    if (equipesDept.length === 0) continue;
    departamentos.push({ departamento: label, equipes: equipesDept });
  }

  return departamentos;
}

export async function loadCapacidadeOperacional(
  unidadeId?: string | null,
): Promise<CapacidadeOperacionalData> {
  const monday = mondayOfOperationalWeek();
  const { start, end } = weekBoundsIso(monday);
  const weekStartMs = new Date(start).getTime();
  const weekEndMs = new Date(end).getTime();

  const supabase = await createClient();

  let equipesQuery = supabase
    .from("equipes")
    .select("id, nome, codigo_operacional, cor_primaria, ativo")
    .eq("ativo", true);
  if (unidadeId) equipesQuery = equipesQuery.eq("unidade_id", unidadeId);

  let agendaQuery = supabase
    .from("agenda_eventos")
    .select(`${AGENDA_EVENTO_DATETIME_COLUMNS}, equipe_id, tipo_evento`)
    .or(
      `and(data_inicio.gte.${start},data_inicio.lt.${end}),and(data_evento.gte.${start},data_evento.lt.${end})`,
    );
  if (unidadeId) agendaQuery = agendaQuery.eq("unidade_id", unidadeId);

  let osQuery = supabase
    .from("ordens_servico")
    .select("id, status, equipe_id, equipe_atual_id, etapa_atual, status_atual")
    .eq("ativo", true);
  if (unidadeId) osQuery = osQuery.eq("unidade_id", unidadeId);

  let crashQuery = supabase
    .from("os_crashes")
    .select(
      `
      ordem_servico_id,
      ordens_servico!inner (
        id,
        ativo,
        status,
        equipe_id,
        equipe_atual_id
      )
    `,
    )
    .eq("status", BLOQUEIO_STATUS_ATIVO);
  if (unidadeId) crashQuery = crashQuery.eq("ordens_servico.unidade_id", unidadeId);

  const [equipesRes, agendaRes, osRes, crashRes] = await Promise.all([
    equipesQuery.order("nome", { ascending: true }),
    agendaQuery,
    osQuery,
    crashQuery,
  ]);

  const error =
    equipesRes.error?.message ??
    agendaRes.error?.message ??
    osRes.error?.message ??
    crashRes.error?.message ??
    null;

  if (error) {
    return { ...CAPACIDADE_OPERACIONAL_VAZIO, error };
  }

  return {
    departamentos: buildDepartamentos(
      (equipesRes.data ?? []) as EquipeRow[],
      (agendaRes.data ?? []) as AgendaRow[],
      (osRes.data ?? []) as OsRow[],
      (crashRes.data ?? []) as unknown as CrashRow[],
      weekStartMs,
      weekEndMs,
    ),
    error: null,
  };
}
