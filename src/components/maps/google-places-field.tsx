"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Field } from "@/components/ui/field";
import { validateGoogleMapsApiKey } from "@/lib/google/maps-api-key";
import { t } from "@/lib/i18n";

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

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types: string[];
};

type PlacePredictionLike = {
  placeId: string;
  text: { text: string };
  toPlace: () => PlaceLike;
};

type PlaceLike = {
  id?: string;
  formattedAddress?: string;
  googleMapsURI?: string;
  location?: { lat: () => number; lng: () => number };
  addressComponents?: AddressComponent[];
  fetchFields: (opts: { fields: string[] }) => Promise<void>;
};

type PlacesLibrary = {
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: {
      input: string;
      sessionToken?: unknown;
      includedRegionCodes?: string[];
      language?: string;
      region?: string;
    }) => Promise<{
      suggestions: Array<{
        placePrediction?: PlacePredictionLike;
      }>;
    }>;
  };
  AutocompleteSessionToken: new () => unknown;
};

type PredictionItem = {
  place_id: string;
  description: string;
  prediction: PlacePredictionLike;
};

declare global {
  interface Window {
    google?: {
      maps?: {
        importLibrary: (name: "places") => Promise<PlacesLibrary>;
      };
    };
    __ccshowerMapsInit?: () => void;
  }
}

let mapsCorePromise: Promise<void> | null = null;
let placesLibraryPromise: Promise<PlacesLibrary> | null = null;
let placesLibraryCache: PlacesLibrary | null = null;

function loadMapsCore(apiKey: string): Promise<void> {
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (mapsCorePromise) return mapsCorePromise;

  mapsCorePromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (window.google?.maps?.importLibrary) resolve();
      else reject(new Error("Google Maps core did not load"));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-google-maps-core]",
    );
    if (existing) {
      if (window.google?.maps?.importLibrary) {
        resolve();
        return;
      }
      existing.addEventListener("load", finish);
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps")),
      );
      return;
    }

    window.__ccshowerMapsInit = () => {
      delete window.__ccshowerMapsInit;
      finish();
    };

    const script = document.createElement("script");
    script.dataset.googleMapsCore = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&v=weekly&loading=async&callback=__ccshowerMapsInit`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return mapsCorePromise;
}

async function loadPlacesLibrary(apiKey: string): Promise<PlacesLibrary> {
  if (placesLibraryCache) return placesLibraryCache;
  if (placesLibraryPromise) return placesLibraryPromise;

  placesLibraryPromise = (async () => {
    await loadMapsCore(apiKey);
    const lib = await window.google!.maps!.importLibrary("places");
    placesLibraryCache = lib;
    return lib;
  })();

  return placesLibraryPromise;
}

function toAddressUpper(value: string): string {
  return value.toLocaleUpperCase("en-US");
}

function getComponent(
  components: AddressComponent[] | undefined,
  type: string,
  short = false,
) {
  const found = components?.find((c) => c.types.includes(type));
  if (!found) return "";
  return (short ? found.shortText : found.longText) ?? "";
}

function placeToAddress(place: PlaceLike): GoogleAddress {
  const streetNumber = getComponent(place.addressComponents, "street_number");
  const route = getComponent(place.addressComponents, "route");
  const cidade =
    getComponent(place.addressComponents, "locality") ||
    getComponent(place.addressComponents, "sublocality") ||
    getComponent(place.addressComponents, "administrative_area_level_2");
  const estado = getComponent(
    place.addressComponents,
    "administrative_area_level_1",
    true,
  );
  const cep = getComponent(place.addressComponents, "postal_code");
  const pais = getComponent(place.addressComponents, "country", true) || "US";
  const lat = place.location?.lat();
  const lng = place.location?.lng();
  const formatted = place.formattedAddress ?? "";
  const mapsUrl =
    place.googleMapsURI ||
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
    google_place_id: place.id ?? "",
    latitude: lat === undefined ? "" : String(lat),
    longitude: lng === undefined ? "" : String(lng),
    google_maps_url: mapsUrl,
  };
}

function mapsErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("ApiTargetBlockedMapError") ||
    msg.includes("ApiNotActivatedMapError") ||
    msg.includes("RefererNotAllowedMapError")
  ) {
    return "Google blocked this request. Enable Maps JavaScript API + Places API (New) in Google Cloud, enable billing, and add this site to the API key HTTP referrers (e.g. localhost:3000/* and your Vercel domain/*).";
  }
  if (msg.includes("REQUEST_DENIED")) {
    return "Google denied the request (REQUEST_DENIED). Check billing, enabled APIs, and API key restrictions.";
  }
  return msg || "Google Places unavailable";
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
  const sessionTokenRef = useRef<unknown | null>(null);
  const requestSeqRef = useRef(0);

  const [query, setQuery] = useState(address.endereco_formatado);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
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

    loadPlacesLibrary(apiKey).catch((e) => {
      if (mounted) {
        setError(mapsErrorMessage(e));
      }
    });

    return () => {
      mounted = false;
    };
  }, [apiKey, active, resetKey]);

  const fetchPredictions = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (trimmed.length < 3) {
        setPredictions([]);
        setOpen(false);
        setError(null);
        return;
      }

      const seq = ++requestSeqRef.current;
      setLoading(true);

      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } =
          await loadPlacesLibrary(apiKey);

        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }

        const { suggestions } =
          await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: trimmed,
            sessionToken: sessionTokenRef.current,
            includedRegionCodes: ["us"],
            language: "en",
            region: "us",
          });

        if (seq !== requestSeqRef.current) return;

        const list: PredictionItem[] = suggestions
          .map((s) => s.placePrediction)
          .filter((p): p is PlacePredictionLike => Boolean(p?.placeId))
          .map((p) => ({
            place_id: p.placeId,
            description: p.text.text,
            prediction: p,
          }));

        setError(null);
        setPredictions(list);
        setOpen(list.length > 0);
        setActiveIndex(-1);
      } catch (e) {
        if (seq !== requestSeqRef.current) return;
        setError(mapsErrorMessage(e));
        setPredictions([]);
        setOpen(false);
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    },
    [apiKey],
  );

  const selectPlace = useCallback(async (item: PredictionItem) => {
    setLoading(true);

    try {
      const place = item.prediction.toPlace();
      await place.fetchFields({
        fields: [
          "addressComponents",
          "formattedAddress",
          "location",
          "id",
          "googleMapsURI",
        ],
      });

      sessionTokenRef.current = null;

      const next = placeToAddress(place);
      setQuery(next.endereco_formatado || toAddressUpper(item.description));
      setOpen(false);
      setPredictions([]);
      setError(null);
      onAddressRef.current(next);
    } catch (e) {
      setError(mapsErrorMessage(e));
    } finally {
      setLoading(false);
    }
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
      <Field label={t("maps.addressLabel")}>
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
              debounceRef.current = setTimeout(() => {
                void fetchPredictions(v);
              }, 280);
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
                void selectPlace(predictions[activeIndex]!);
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
                ? t("maps.placeholderManual")
                : t("maps.placeholderAutocomplete")
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
                    onClick={() => void selectPlace(p)}
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
            t("maps.searching")
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
