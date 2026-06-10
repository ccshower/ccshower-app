/**
 * Diagnóstico: inconsistência contador vs lista — Agenda Global
 * Uso: node scripts/diagnose-agenda-global.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const OPERATIONAL_TZ = "America/New_York";
const FIELD_EVENT_TYPES = new Set(["technical_visit", "measurement", "installation"]);
const INACTIVE_STATUSES = new Set(["completed", "cancelled", "cancelado", "concluido"]);

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) throw new Error(".env.local não encontrado");
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function hojeOperacionalYmd() {
  return new Date().toLocaleDateString("en-CA", { timeZone: OPERATIONAL_TZ });
}

function isoRangeDiaOperacional(ymd) {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  let utcMs = Date.UTC(y, mo - 1, d, 0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: OPERATIONAL_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(utcMs));
    const gotY = Number(parts.find((p) => p.type === "year")?.value);
    const gotMo = Number(parts.find((p) => p.type === "month")?.value);
    const gotD = Number(parts.find((p) => p.type === "day")?.value);
    const gotH = Number(parts.find((p) => p.type === "hour")?.value);
    const gotMi = Number(parts.find((p) => p.type === "minute")?.value);
    const wantMs = Date.UTC(y, mo - 1, d, 0, 0, 0);
    const gotMs = Date.UTC(gotY, gotMo - 1, gotD, gotH, gotMi, 0);
    utcMs += wantMs - gotMs;
  }
  const start = new Date(utcMs).toISOString();
  const end = new Date(utcMs + 86_399_999).toISOString();
  return { start, end };
}

function agendaEventoStartIso(row) {
  if (row.data_inicio) return row.data_inicio;
  if (row.data_evento && row.hora_evento) {
    const datePart = row.data_evento.slice(0, 10);
    const hm = row.hora_evento.trim().slice(0, 5);
    return zonedWallClockToUtcIso(datePart, hm);
  }
  if (row.data_evento) return row.data_evento;
  return null;
}

function zonedWallClockToUtcIso(dateYmd, timeHm) {
  const m = dateYmd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = timeHm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m || !t) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(t[1]);
  const mi = Number(t[2]);
  let utcMs = Date.UTC(y, mo - 1, d, h, mi, 0);
  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: OPERATIONAL_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(utcMs));
    const gotY = Number(parts.find((p) => p.type === "year")?.value);
    const gotMo = Number(parts.find((p) => p.type === "month")?.value);
    const gotD = Number(parts.find((p) => p.type === "day")?.value);
    const gotH = Number(parts.find((p) => p.type === "hour")?.value);
    const gotMi = Number(parts.find((p) => p.type === "minute")?.value);
    const wantMs = Date.UTC(y, mo - 1, d, h, mi, 0);
    const gotMs = Date.UTC(gotY, gotMo - 1, gotD, gotH, gotMi, 0);
    utcMs += wantMs - gotMs;
  }
  return new Date(utcMs).toISOString();
}

function eventDayYmd(startIso) {
  return new Date(startIso).toLocaleDateString("en-CA", { timeZone: OPERATIONAL_TZ });
}

function operationalWallClockHm(iso) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: OPERATIONAL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h.padStart(2, "0")}:${m}`;
}

function isActiveCalendarAgendaStatus(status) {
  return !INACTIVE_STATUSES.has(status ?? "");
}

function isListableFieldEvent(row) {
  return FIELD_EVENT_TYPES.has(row.tipo_evento) && isActiveCalendarAgendaStatus(row.status);
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const hojeYmd = hojeOperacionalYmd();
const rangeHoje = isoRangeDiaOperacional(hojeYmd);
const nowMs = Date.now();
const nowIso = new Date(nowMs).toISOString();

console.log("=== Agenda Global — diagnóstico ===");
console.log({ hojeYmd, nowIso, rangeHoje });

const { data: rows, error } = await admin
  .from("agenda_eventos")
  .select(
    "id, tipo_evento, status, data_evento, data_inicio, hora_evento, etapa, titulo, clientes!cliente_id(nome)",
  )
  .or(
    `and(data_inicio.gte.${rangeHoje.start},data_inicio.lte.${rangeHoje.end}),and(data_evento.gte.${rangeHoje.start},data_evento.lte.${rangeHoje.end})`,
  );

if (error) {
  console.error("Erro query:", error.message);
  process.exit(1);
}

console.log(`\nRegistros brutos na query (tabela agenda_eventos): ${rows?.length ?? 0}\n`);

const enriched = (rows ?? []).map((row) => {
  const startIso = agendaEventoStartIso(row);
  const dayYmd = startIso ? eventDayYmd(startIso) : null;
  const startMs = startIso ? new Date(startIso).getTime() : null;
  const horaOperacional = startIso ? operationalWallClockHm(startIso) : null;
  return {
    id: row.id,
    tipo_evento: row.tipo_evento,
    status: row.status,
    data_evento: row.data_evento,
    hora_evento: row.hora_evento,
    data_inicio: row.data_inicio,
    etapa: row.etapa,
    cliente: row.clientes?.nome ?? row.titulo,
    startIso,
    dayYmd,
    horaOperacional,
    startMs,
    passaListableFieldEvent: isListableFieldEvent(row),
    passaDiaHoje: dayYmd === hojeYmd,
    temporal: startMs != null && startMs < nowMs ? "passado" : "futuro",
    motivoExclusaoLista: null,
  };
});

for (const ev of enriched) {
  if (!ev.passaListableFieldEvent) {
    if (!FIELD_EVENT_TYPES.has(ev.tipo_evento)) {
      ev.motivoExclusaoLista = `tipo_evento "${ev.tipo_evento}" não é field event`;
    } else if (!isActiveCalendarAgendaStatus(ev.status)) {
      ev.motivoExclusaoLista = `status "${ev.status}" inativo no calendário`;
    }
  } else if (!ev.passaDiaHoje) {
    ev.motivoExclusaoLista = `dayYmd ${ev.dayYmd} !== hoje ${hojeYmd}`;
  }
}

const contador = enriched.filter((e) => e.passaListableFieldEvent && e.passaDiaHoje);
const lista = contador;

console.log("--- Filtros ---");
console.log(`
CONTADOR (badge) e LISTA:
  tabela: agenda_eventos
  query: data_inicio OU data_evento dentro do range do dia operacional
  + tipo_evento IN (technical_visit, measurement, installation)
  + status NOT IN (completed, cancelled, cancelado, concluido)
  + dayYmd === hoje
  mesmo conjunto — sem filtro de hora futura, sem slice
  temporal (UI): passado se startMs < now, futuro se startMs >= now
`);

console.log(`\nContador: ${contador.length}`);
console.log(`Lista:    ${lista.length}`);
console.log(`Divergência: ${contador.length - lista.length}\n`);

if (contador.length > 0) {
  console.log("--- Eventos contados (totalEventos) ---");
  for (const ev of contador) {
    console.log(JSON.stringify({
      id: ev.id,
      tipo_evento: ev.tipo_evento,
      status: ev.status,
      data_evento: ev.data_evento,
      hora_evento: ev.hora_evento,
      data_inicio: ev.data_inicio,
      horaOperacional: ev.horaOperacional,
      cliente: ev.cliente,
      temporal: ev.temporal,
    }, null, 2));
  }
}

const passados = contador.filter((e) => e.temporal === "passado");
if (passados.length > 0) {
  console.log("\n--- Eventos passados (ainda na lista) ---");
  console.log(JSON.stringify(passados.map((e) => ({
    id: e.id,
    horaOperacional: e.horaOperacional,
    cliente: e.cliente,
    temporal: e.temporal,
  })), null, 2));
}

const brutosHoje = enriched.filter((e) => e.passaDiaHoje);
if (brutosHoje.length > contador.length) {
  console.log("\n--- Registros de hoje excluídos do contador ---");
  console.log(JSON.stringify(
    brutosHoje.filter((e) => !e.passaListableFieldEvent).map((e) => ({
      id: e.id,
      tipo_evento: e.tipo_evento,
      status: e.status,
      data_evento: e.data_evento,
      hora_evento: e.hora_evento,
      motivo: e.motivoExclusaoLista,
    })),
    null,
    2,
  ));
}
