export type OpenRouteWebhookPayload = {
  event: "technical_visit_open_route" | "installer_open_route";
  os_id: string;
  empresa_id: string | null;
  etapa_atual: "commercial" | "installation";
  cliente: {
    id: string;
    nome: string;
    telefone: string;
    endereco_formatado: string | null;
  };
  destino: { latitude: number | null; longitude: number | null };
  origem: {
    latitude: number;
    longitude: number;
    captured_at: string;
  } | null;
  eta: {
    minutos: number | null;
    chegada_local: string | null;
    chegada_iso: string | null;
    distancia_milhas: number | null;
    com_trafego: boolean;
  };
  equipe_nome: string | null;
  tecnico_nome: string | null;
  timezone: "America/New_York";
};

function openRouteWebhookUrl(): string {
  return process.env.N8N_WEBHOOK_OPEN_ROUTE_URL?.trim() ?? "";
}

function openRouteWebhookSecret(): string {
  return process.env.N8N_WEBHOOK_SECRET?.trim() ?? "";
}

export function isN8nOpenRouteWebhookConfigured(): boolean {
  return Boolean(openRouteWebhookUrl() && openRouteWebhookSecret());
}

export async function dispatchOpenRouteWebhook(
  payload: OpenRouteWebhookPayload,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const url = openRouteWebhookUrl();
  if (!url) {
    return {
      ok: false,
      message: "N8N_WEBHOOK_OPEN_ROUTE_URL nao configurada",
    };
  }

  const secret = openRouteWebhookSecret();
  if (!secret) {
    return {
      ok: false,
      message: "N8N_WEBHOOK_SECRET nao configurada",
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${secret}`,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(
        "[open-route] webhook N8N respondeu com erro:",
        res.status,
        detail,
      );
      return {
        ok: false,
        message: `Webhook N8N retornou HTTP ${res.status}`,
      };
    }

    return { ok: true };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      const message = "Webhook N8N excedeu o limite de 8 segundos";
      console.error("[open-route] webhook N8N expirou:", error);
      return { ok: false, message };
    }

    const message =
      error instanceof Error ? error.message : "Falha ao chamar webhook N8N";
    console.error("[open-route] falha ao chamar webhook N8N:", error);
    return { ok: false, message };
  }
}
