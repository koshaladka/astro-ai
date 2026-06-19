import {
  getDaDataCredentials,
  getPlacesProvider,
} from "@/lib/utils/places-provider";

export type PlaceSuggestion = {
  id: string;
  label: string;
  placeName: string;
  latitude: number;
  longitude: number;
  source: "table" | "nominatim" | "dadata";
};

type SearchOptions = {
  signal?: AbortSignal;
};

// Популярные города для быстрого выбора
const POPULAR_CITIES: PlaceSuggestion[] = [
  { id: "moscow", label: "Москва, Россия", placeName: "Москва", latitude: 55.7558, longitude: 37.6173, source: "table" },
  { id: "spb", label: "Санкт-Петербург, Россия", placeName: "Санкт-Петербург", latitude: 59.9343, longitude: 30.3351, source: "table" },
  { id: "nsk", label: "Новосибирск, Россия", placeName: "Новосибирск", latitude: 55.0084, longitude: 82.9357, source: "table" },
  { id: "ekb", label: "Екатеринбург, Россия", placeName: "Екатеринбург", latitude: 56.8389, longitude: 60.6057, source: "table" },
  { id: "kazan", label: "Казань, Россия", placeName: "Казань", latitude: 55.7963, longitude: 49.1088, source: "table" },
  { id: "nn", label: "Нижний Новгород, Россия", placeName: "Нижний Новгород", latitude: 56.2965, longitude: 43.9361, source: "table" },
  { id: "samara", label: "Самара, Россия", placeName: "Самара", latitude: 53.1959, longitude: 50.1002, source: "table" },
  { id: "rostov", label: "Ростов-на-Дону, Россия", placeName: "Ростов-на-Дону", latitude: 47.2357, longitude: 39.7015, source: "table" },
];

const ALIASES: Record<string, PlaceSuggestion> = {
  москва: POPULAR_CITIES[0],
  "санкт-петербург": POPULAR_CITIES[1],
  спб: POPULAR_CITIES[1],
  питер: POPULAR_CITIES[1],
};

const NOMINATIM_TIMEOUT_MS = 10_000;
const DADATA_TIMEOUT_MS = 8_000;

// Ищет города по строке — сначала локальная таблица, потом внешний провайдер
export async function searchPlaces(
  query: string,
  options?: SearchOptions
): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (!q) return POPULAR_CITIES;

  const lower = q.toLowerCase();
  const aliasHit = ALIASES[lower];
  const tableHits = POPULAR_CITIES.filter(
    (p) =>
      p.placeName.toLowerCase().includes(lower) ||
      p.label.toLowerCase().includes(lower)
  );

  const results = aliasHit
    ? [aliasHit, ...tableHits.filter((p) => p.id !== aliasHit.id)]
    : tableHits;

  if (results.length > 0) {
    return dedupe(results).slice(0, 8);
  }

  const remote = await fetchRemotePlaces(q, options?.signal);
  return dedupe(remote).slice(0, 8);
}

// Превращает название города в координаты
export async function geocodePlace(
  name: string,
  coords?: { latitude?: number; longitude?: number }
) {
  if (coords?.latitude != null && coords?.longitude != null) {
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      source: "manual" as const,
    };
  }

  const lower = name.trim().toLowerCase();
  const alias = ALIASES[lower];
  if (alias) {
    return { latitude: alias.latitude, longitude: alias.longitude, source: "table" as const };
  }

  const tableHit = POPULAR_CITIES.find(
    (p) => p.placeName.toLowerCase() === lower || p.label.toLowerCase().startsWith(lower)
  );
  if (tableHit) {
    return { latitude: tableHit.latitude, longitude: tableHit.longitude, source: "table" as const };
  }

  const remote = await fetchRemotePlaces(name);
  if (remote[0]) {
    return {
      latitude: remote[0].latitude,
      longitude: remote[0].longitude,
      source: remote[0].source,
    };
  }

  throw new Error(`Город «${name}» не найден. Выберите из списка.`);
}

// Запрашивает подсказки у выбранного в env провайдера
async function fetchRemotePlaces(
  query: string,
  signal?: AbortSignal
): Promise<PlaceSuggestion[]> {
  if (getPlacesProvider() === "dadata") {
    return fetchDaData(query, signal);
  }

  return fetchNominatim(query, signal);
}

// Запрашивает подсказки у OpenStreetMap Nominatim
async function fetchNominatim(
  query: string,
  externalSignal?: AbortSignal
): Promise<PlaceSuggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "8");
  url.searchParams.set("accept-language", "ru");
  url.searchParams.set("countrycodes", "ru");
  url.searchParams.set("featuretype", "city");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort);

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "astro-app/1.0 (natal-chart)" },
      next: { revalidate: 86400 },
      signal: controller.signal,
    });

    if (!res.ok) return [];

    const data = (await res.json()) as Array<{
      place_id: number;
      lat: string;
      lon: string;
      display_name: string;
    }>;

    return data.map((item) => ({
      id: String(item.place_id),
      label: item.display_name,
      placeName: item.display_name.split(",")[0]?.trim() || item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      source: "nominatim" as const,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

// Запрашивает подсказки городов у DaData
async function fetchDaData(
  query: string,
  externalSignal?: AbortSignal
): Promise<PlaceSuggestion[]> {
  const creds = getDaDataCredentials();
  if (!creds) {
    console.error("PLACES_PROVIDER=dadata, но DADATA_API_KEY или DADATA_SECRET_KEY не заданы");
    return [];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DADATA_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort);

  try {
    const res = await fetch(
      "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Token ${creds.apiKey}`,
          "X-Secret": creds.secret,
        },
        body: JSON.stringify({
          query,
          count: 8,
          from_bound: { value: "city" },
          to_bound: { value: "settlement" },
          locations: [{ country: "Россия" }],
        }),
        signal: controller.signal,
      }
    );

    if (!res.ok) return [];

    const data = (await res.json()) as {
      suggestions?: Array<{
        value: string;
        data: {
          fias_id?: string | null;
          geo_lat?: string | null;
          geo_lon?: string | null;
          city?: string | null;
          settlement?: string | null;
        };
      }>;
    };

    return (data.suggestions ?? [])
      .map(mapDaDataSuggestion)
      .filter((item): item is PlaceSuggestion => item != null);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

// Превращает ответ DaData в подсказку города
function mapDaDataSuggestion(suggestion: {
  value: string;
  data: {
    fias_id?: string | null;
    geo_lat?: string | null;
    geo_lon?: string | null;
    city?: string | null;
    settlement?: string | null;
  };
}): PlaceSuggestion | null {
  const latitude = suggestion.data.geo_lat ? Number(suggestion.data.geo_lat) : NaN;
  const longitude = suggestion.data.geo_lon ? Number(suggestion.data.geo_lon) : NaN;

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  const placeName =
    suggestion.data.city ||
    suggestion.data.settlement ||
    suggestion.value.split(",")[0]?.trim() ||
    suggestion.value;

  return {
    id: suggestion.data.fias_id || suggestion.value,
    label: suggestion.value,
    placeName,
    latitude,
    longitude,
    source: "dadata",
  };
}

function dedupe(items: PlaceSuggestion[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.latitude.toFixed(4)}:${item.longitude.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
