const GOOGLE_ROUTES_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";
const GOOGLE_ROUTES_FIELD_MASK = "routes.duration,routes.distanceMeters";

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type DrivingEta = {
  minutos: number;
  distanciaMetros: number;
  durationSeconds: number;
};

type ComputeRoutesResponse = {
  routes?: Array<{
    duration?: string;
    distanceMeters?: number;
  }>;
};

/**
 * Calcula a ETA de carro entre duas coordenadas usando a Google Routes API.
 * Retorna `null` para configuração, validação ou falhas da API.
 */
export async function computeDrivingEta({
  origin,
  destination,
}: {
  origin: RouteCoordinate;
  destination: RouteCoordinate;
}): Promise<DrivingEta | null> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim();
  if (!apiKey || !isValidCoordinate(origin) || !isValidCoordinate(destination)) {
    return null;
  }

  const response =
    (await requestRoute(apiKey, origin, destination, "TRAFFIC_AWARE")) ??
    (await requestRoute(apiKey, origin, destination, "TRAFFIC_UNAWARE"));

  if (!response) return null;

  const route = response.routes?.[0];
  const durationSeconds = parseDurationSeconds(route?.duration);
  const distanciaMetros = route?.distanceMeters;

  if (
    durationSeconds == null ||
    distanciaMetros == null ||
    !Number.isFinite(distanciaMetros) ||
    distanciaMetros < 0
  ) {
    return null;
  }

  return {
    minutos: Math.ceil(durationSeconds / 60),
    distanciaMetros,
    durationSeconds,
  };
}

async function requestRoute(
  apiKey: string,
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  routingPreference: "TRAFFIC_AWARE" | "TRAFFIC_UNAWARE",
): Promise<ComputeRoutesResponse | null> {
  try {
    const response = await fetch(GOOGLE_ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": GOOGLE_ROUTES_FIELD_MASK,
      },
      body: JSON.stringify({
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: destination } },
        travelMode: "DRIVE",
        routingPreference,
      }),
    });

    if (!response.ok) return null;
    return (await response.json()) as ComputeRoutesResponse;
  } catch {
    return null;
  }
}

function isValidCoordinate({ latitude, longitude }: RouteCoordinate): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function parseDurationSeconds(duration: string | undefined): number | null {
  const match = duration?.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) return null;

  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}
