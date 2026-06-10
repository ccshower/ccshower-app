"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Field } from "@/components/ui/field";
import { validateGoogleMapsApiKey } from "@/lib/google/maps-api-key";

export type GoogleAddress = {
  endereco_formatado: string;
  endereco_linha1: string;
  cidade: string;
  estado: string;
  cep: string;
  pais: string;
  google_place_id: string;
  latitude: string;
  longitude: string;
  google_maps_url: string;
};

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type PlacePrediction = {
  description: string;
  place_id: string;
};

type GooglePlace = {
  place_id?: string;
  formatted_address?: string;
  url?: string;
  address_components?: GoogleAddressComponent[];
  geometry?: {
    location?: {
      lat: () => number;
      lng: () => number;
    };
  };
};

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          PlacesServiceStatus: { OK: string; ZERO_RESULTS: string; REQUEST_DENIED: string };
          AutocompleteService: new () => {
            getPlacePredictions: (
              request: Record<string, unknown>,
              callback: (
                predictions: PlacePrediction[] | null,
                status: string,
              ) => void,
            ) => void;
          };
          PlacesService: new (el: HTMLElement) => {
            getDetails: (
              request: { placeId: string; fields: string[] },
              callback: (place: GooglePlace | null, status: string) => void,
            ) => void;
          };
        };
      };
    };
    __ccshowerMapsInit?: () => void;
  }
}

let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string) {
  if (!apiKey) return Promise.reject(new Error("Chave do Google Maps ausente"));
  if (window.google?.maps?.places) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (window.google?.maps?.places) resolve();
      else reject(new Error("Biblioteca Places nao carregou"));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-google-places]",
    );
    if (existing) {
      if (window.google?.maps?.places) {
        resolve();
        return;
      }
      existing.addEventListener("load", finish);
      existing.addEventListener("error", () =>
        reject(new Error("Falha ao carregar Google Maps")),
      );
      return;
    }

    window.__ccshowerMapsInit = () => {
      delete window.__ccshowerMapsInit;
      finish();
    };

    const script = document.createElement("script");
    script.dataset.googlePlaces = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=places&language=en&region=US&loading=async&callback=__ccshowerMapsInit`;
    script.async = true;
    script.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function toAddressUpper(value: string): string {
  return value.toLocaleUpperCase("en-US");
}

function getComponent(
  components: GoogleAddressComponent[] | undefined,
  type: string,
  short = false,
) {
  const found = components?.find((c) => c.types.includes(type));
  return found ? (short ? found.short_name : found.long_name) : "";
}

function placeToAddress(place: GooglePlace): GoogleAddress {
  const streetNumber = getComponent(place.address_components, "street_number");
  const route = getComponent(place.address_components, "route");
  const cidade =
    getComponent(place.address_components, "locality") ||
    getComponent(place.address_components, "sublocality") ||
    getComponent(place.address_components, "administrative_area_level_2");
  const estado = getComponent(
    place.address_components,
    "administrative_area_level_1",
    true,
  );
  const cep = getComponent(place.address_components, "postal_code");
  const pais = getComponent(place.address_components, "country", true) || "US";
  const lat = place.geometry?.location?.lat();
  const lng = place.geometry?.location?.lng();
  const formatted = place.formatted_address ?? "";
  const mapsUrl =
    place.url ||
    (lat !== undefined && lng !== undefined
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : "");

  return {
    endereco_formatado: toAddressUpper(formatted),
    endereco_linha1: toAddressUpper([streetNumber, route].filter(Boolean).join(" ")),
    cidade: toAddressUpper(cidade),
    estado: (estado || "FL").toUpperCase(),
    cep,
    pais: pais.toUpperCase(),
    google_place_id: place.place_id ?? "",
    latitude: lat === undefined ? "" : String(lat),
    longitude: lng === undefined ? "" : String(lng),
    google_maps_url: mapsUrl,
  };
}

function placesStatusMessage(status: string): string | null {
  const S = window.google?.maps?.places?.PlacesServiceStatus;
  if (!S) return null;
  if (status === S.OK || status === S.ZERO_RESULTS) return null;
  if (status === S.REQUEST_DENIED) {
    return "Google recusou a busca (REQUEST_DENIED). Verifique billing, APIs ativas e restricao HTTP referrer em localhost:3000.";
  }
  return `Google Places: ${status}`;
}

export function emptyGoogleAddress(): GoogleAddress {
  return {
    endereco_formatado: "",
    endereco_linha1: "",
    cidade: "",
    estado: "FL",
    cep: "",
    pais: "US",
    google_place_id: "",
    latitude: "",
    longitude: "",
    google_maps_url: "",
  };
}

export function googleAddressFromCliente(c?: {
  endereco_formatado: string;
  endereco_linha1?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  pais?: string;
  google_place_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  google_maps_url?: string | null;
} | null): GoogleAddress {
  if (!c) return emptyGoogleAddress();
  return {
    endereco_formatado: toAddressUpper(c.endereco_formatado),
    endereco_linha1: toAddressUpper(c.endereco_linha1 ?? ""),
    cidade: toAddressUpper(c.cidade ?? ""),
    estado: c.estado ?? "FL",
    cep: c.cep ?? "",
    pais: c.pais ?? "US",
    google_place_id: c.google_place_id ?? "",
    latitude: c.latitude === null || c.latitude === undefined ? "" : String(c.latitude),
    longitude:
      c.longitude === null || c.longitude === undefined ? "" : String(c.longitude),
    google_maps_url: c.google_maps_url ?? "",
  };
}

type Props = {
  apiKey: string;
  resetKey: string;
  address: GoogleAddress;
  onAddress: (next: GoogleAddress) => void;
  active?: boolean;
};

export function GooglePlacesField({
  apiKey,
  resetKey,
  address,
  onAddress,
  active = true,
}: Props) {
  const onAddressRef = useRef(onAddress);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesHostRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState(address.endereco_formatado);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const hintId = useId();
  const listId = useId();

  useEffect(() => {
    onAddressRef.current = onAddress;
  }, [onAddress]);

  useEffect(() => {
    setQuery(address.endereco_formatado);
  }, [resetKey, address.endereco_formatado]);

  useEffect(() => {
    if (!active) return;

    const keyCheck = validateGoogleMapsApiKey(apiKey);
    if (!keyCheck.valid) {
      setError(keyCheck.message);
      return;
    }

    let mounted = true;
    setError(null);

    loadGoogleMaps(apiKey)
      .catch((e) => {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Google Places indisponivel");
        }
      });

    return () => {
      mounted = false;
    };
  }, [apiKey, active, resetKey]);

  const fetchPredictions = useCallback(
    (input: string) => {
      const places = window.google?.maps?.places;
      if (!places?.AutocompleteService) return;

      const trimmed = input.trim();
      if (trimmed.length < 3) {
        setPredictions([]);
        setOpen(false);
        setError(null);
        return;
      }

      setLoading(true);
      const service = new places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: trimmed,
          componentRestrictions: { country: "us" },
        },
        (results, status) => {
          setLoading(false);
          const msg = placesStatusMessage(status);
          if (msg) {
            setError(msg);
            setPredictions([]);
            setOpen(false);
            return;
          }
          setError(null);
          const list = results ?? [];
          setPredictions(list);
          setOpen(list.length > 0);
          setActiveIndex(-1);
        },
      );
    },
    [],
  );

  const selectPlace = useCallback((placeId: string, description: string) => {
    const places = window.google?.maps?.places;
    if (!places?.PlacesService) return;

    if (!placesHostRef.current) {
      placesHostRef.current = document.createElement("div");
      placesHostRef.current.style.display = "none";
      document.body.appendChild(placesHostRef.current);
    }

    setLoading(true);
    const svc = new places.PlacesService(placesHostRef.current);
    svc.getDetails(
      {
        placeId,
        fields: ["address_components", "formatted_address", "geometry", "place_id", "url"],
      },
      (place, status) => {
        setLoading(false);
        const msg = placesStatusMessage(status);
        if (msg || !place) {
          setError(msg ?? "Nao foi possivel carregar o endereco.");
          return;
        }
        const next = placeToAddress(place);
        setQuery(next.endereco_formatado || toAddressUpper(description));
        setOpen(false);
        setPredictions([]);
        onAddressRef.current(next);
      },
    );
  }, []);

  useEffect(() => {
    return () => {
      placesHostRef.current?.remove();
      placesHostRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const keyInvalid = !validateGoogleMapsApiKey(apiKey).valid;
  const manualOnly = keyInvalid || !!error;

  return (
    <div className="space-y-2" ref={wrapRef}>
      <Field label="Endereco">
        <div className="relative">
          <input
            name="endereco_busca"
            type="text"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-describedby={error || loading ? hintId : undefined}
            value={query}
            onChange={(e) => {
              const v = toAddressUpper(e.target.value);
              setQuery(v);
              if (manualOnly) {
                onAddressRef.current({ ...address, endereco_formatado: v });
                return;
              }
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => fetchPredictions(v), 280);
            }}
            onFocus={() => {
              if (predictions.length > 0) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (!open || predictions.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, predictions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && activeIndex >= 0) {
                e.preventDefault();
                const p = predictions[activeIndex];
                selectPlace(p.place_id, p.description);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            onBlur={(e) => {
              if (manualOnly) {
                onAddressRef.current({
                  ...address,
                  endereco_formatado: toAddressUpper(e.target.value.trim()),
                });
              }
            }}
            required
            className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light uppercase text-cc-ink outline-none transition placeholder:normal-case placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus"
            placeholder={
              manualOnly
                ? "Digite o endereco completo (rua, cidade, FL, ZIP)"
                : "Digite rua ou numero — ex. 5400 Sheridan St"
            }
          />
          {open && predictions.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-52 overflow-y-auto rounded-sm border border-cc-border bg-white py-1 shadow-lift"
            >
              {predictions.map((p, i) => (
                <li key={p.place_id} role="option" aria-selected={i === activeIndex}>
                  <button
                    type="button"
                    className={`w-full px-3 py-2 text-left text-sm font-light text-cc-ink hover:bg-cc-blue-soft ${
                      i === activeIndex ? "bg-cc-blue-soft" : ""
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectPlace(p.place_id, p.description)}
                  >
                    {toAddressUpper(p.description)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Field>
      {error || loading ? (
        <p id={hintId} className="text-xs font-light text-cc-muted">
          {error ? (
            <span className="text-cc-red">{error}</span>
          ) : (
            "Buscando enderecos..."
          )}
        </p>
      ) : null}
      <input type="hidden" name="endereco_formatado" value={address.endereco_formatado} readOnly />
      <input type="hidden" name="endereco_linha1" value={address.endereco_linha1} readOnly />
      <input type="hidden" name="cidade" value={address.cidade} readOnly />
      <input type="hidden" name="estado" value={address.estado} readOnly />
      <input type="hidden" name="cep" value={address.cep} readOnly />
      <input type="hidden" name="pais" value={address.pais} readOnly />
      <input type="hidden" name="google_place_id" value={address.google_place_id} readOnly />
      <input type="hidden" name="latitude" value={address.latitude} readOnly />
      <input type="hidden" name="longitude" value={address.longitude} readOnly />
      <input type="hidden" name="google_maps_url" value={address.google_maps_url} readOnly />
    </div>
  );
}
