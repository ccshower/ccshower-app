import { NextResponse } from "next/server";

import { clienteDirectionsUrl } from "@/lib/ordens-servico/cliente-directions-url";
import { OPERATIONAL_TZ } from "@/lib/ordens-servico/datetime";
import { computeDrivingEta } from "@/lib/ordens-servico/google-routes";
import {
  openRouteEventForStage,
  stageTriggersClientEtaSms,
} from "@/lib/ordens-servico/open-route-policy";
import {
  dispatchOpenRouteWebhook,
  type OpenRouteWebhookPayload,
} from "@/lib/ordens-servico/os-open-route-webhook";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import { clienteMapsUrl } from "@/lib/ordens-servico/visita-comercial";
import { spreadAgendaEventoDatetime } from "@/lib/ordens-servico/agenda-evento-query";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

type OpenRouteBody = {
  originLat?: unknown;
  originLng?: unknown;
  capturedAt?: unknown;
};

type Coordinate = { latitude: number; longitude: number };

function coordinateFromBody(body: OpenRouteBody): Coordinate | null {
  const latitude = typeof body.originLat === "number" ? body.originLat : null;
  const longitude = typeof body.originLng === "number" ? body.originLng : null;

  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function capturedAtFromBody(capturedAt: unknown): string {
  if (typeof capturedAt !== "string") return new Date().toISOString();
  const parsed = new Date(capturedAt);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function etaArrival(etaMinutes: number): {
  chegadaLocal: string;
  chegadaIso: string;
} {
  const arrival = new Date(Date.now() + etaMinutes * 60_000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: OPERATIONAL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(arrival);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const offset = value("timeZoneName").replace("GMT", "") || "Z";

  return {
    chegadaLocal: new Intl.DateTimeFormat("en-US", {
      timeZone: OPERATIONAL_TZ,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(arrival),
    chegadaIso: `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}:${value("second")}${offset}`,
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: osId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Session expired" },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as OpenRouteBody;
    const origin = coordinateFromBody(body);
    const capturedAt = capturedAtFromBody(body.capturedAt);

    const { data: os, error: osError } = await supabase
      .from("ordens_servico")
      .select(
        "id, empresa_id, cliente_id, etapa_atual, equipe_id, equipe_atual_id, responsavel_id",
      )
      .eq("id", osId)
      .single();

    if (osError || !os) {
      return NextResponse.json(
        { ok: false, message: "Work order not found" },
        { status: 404 },
      );
    }

    const teamId = os.equipe_atual_id ?? os.equipe_id;
    const [clienteResult, equipeResult, tecnicoResult] = await Promise.all([
      supabase
        .from("clientes")
        .select(
          "id, nome, telefone, endereco_formatado, latitude, longitude, google_maps_url",
        )
        .eq("id", os.cliente_id)
        .single(),
      teamId
        ? supabase.from("equipes").select("id, nome").eq("id", teamId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("usuarios").select("nome").eq("id", user.id).maybeSingle(),
    ]);

    if (clienteResult.error || !clienteResult.data) {
      return NextResponse.json(
        { ok: false, message: "Customer not found" },
        { status: 404 },
      );
    }

    const cliente = clienteResult.data;
    const mapsUrl =
      (origin
        ? clienteDirectionsUrl({
            originLat: origin.latitude,
            originLng: origin.longitude,
            cliente,
          })
        : null) ?? clienteMapsUrl(cliente);
    const stage = parseOsStage(os.etapa_atual);

    if (
      !stageTriggersClientEtaSms(stage) ||
      (stage !== "commercial" && stage !== "installation")
    ) {
      return NextResponse.json({ ok: true, mapsUrl, smsQueued: false });
    }

    if (!cliente.telefone?.trim()) {
      return NextResponse.json({
        ok: true,
        mapsUrl,
        smsQueued: false,
        message: "Customer phone missing",
      });
    }

    const dedupeSince = new Date(Date.now() - 20 * 60_000).toISOString();
    const { data: recentSms, error: dedupeError } = await supabase
      .from("agenda_eventos")
      .select("id")
      .eq("ordem_servico_id", os.id)
      .or("titulo.eq.client_eta_sms,descricao.ilike.%client_eta_sms%")
      .gte("criado_em", dedupeSince)
      .order("criado_em", { ascending: false })
      .limit(1);

    if (dedupeError) {
      console.error("[open-route] failed to check SMS dedupe:", dedupeError);
      return NextResponse.json({
        ok: true,
        mapsUrl,
        smsQueued: false,
        message: "Unable to verify recent customer notification",
      });
    }

    if (recentSms?.length) {
      return NextResponse.json({
        ok: true,
        mapsUrl,
        smsQueued: false,
        message: "Customer notification was recently queued",
      });
    }

    const eta =
      origin && cliente.latitude != null && cliente.longitude != null
        ? await computeDrivingEta({
            origin,
            destination: {
              latitude: cliente.latitude,
              longitude: cliente.longitude,
            },
          })
        : null;
    const arrival = eta ? etaArrival(eta.minutos) : null;
    const payload: OpenRouteWebhookPayload = {
      event: openRouteEventForStage(stage),
      os_id: os.id,
      empresa_id: os.empresa_id ?? null,
      etapa_atual: stage,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone,
        endereco_formatado: cliente.endereco_formatado ?? null,
      },
      destino: {
        latitude: cliente.latitude ?? null,
        longitude: cliente.longitude ?? null,
      },
      origem: origin
        ? {
            ...origin,
            captured_at: capturedAt,
          }
        : null,
      eta: {
        minutos: eta?.minutos ?? null,
        chegada_local: arrival?.chegadaLocal ?? null,
        chegada_iso: arrival?.chegadaIso ?? null,
        distancia_milhas:
          eta == null ? null : Number((eta.distanciaMetros / 1609.34).toFixed(2)),
        com_trafego: eta != null,
      },
      equipe_nome: equipeResult.data?.nome ?? null,
      tecnico_nome: tecnicoResult.data?.nome ?? null,
      timezone: OPERATIONAL_TZ,
    };
    const webhook = await dispatchOpenRouteWebhook(payload);

    if (!webhook.ok) {
      return NextResponse.json({
        ok: true,
        mapsUrl,
        etaMinutes: eta?.minutos ?? null,
        smsQueued: false,
        message: "Customer notification could not be queued",
      });
    }

    const now = new Date().toISOString();
    const { error: eventError } = await supabase.from("agenda_eventos").insert({
      ordem_servico_id: os.id,
      cliente_id: cliente.id,
      equipe_id: teamId ?? null,
      responsavel_id: os.responsavel_id ?? user.id,
      tipo_evento: "other",
      etapa: stage,
      status: "completed",
      titulo: "client_eta_sms",
      descricao: "client_eta_sms",
      ...spreadAgendaEventoDatetime(now),
    });

    if (eventError) {
      console.error("[open-route] failed to record SMS queue event:", eventError);
    }

    return NextResponse.json({
      ok: true,
      mapsUrl,
      etaMinutes: eta?.minutos ?? null,
      smsQueued: true,
    });
  } catch (error) {
    console.error("[open-route] unexpected error:", error);
    return NextResponse.json(
      { ok: false, message: "Unable to open route" },
      { status: 500 },
    );
  }
}
