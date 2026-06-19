export type PlaceSuggestion = {
  id: string;
  label: string;
  placeName: string;
  latitude: number;
  longitude: number;
  source: "table" | "nominatim";
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

// Ищет города по строке — сначала локальная таблица, потом Nominatim
export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
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

  const remote = await fetchNominatim(q);
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

  const remote = await fetchNominatim(name);
  if (remote[0]) {
    return {
      latitude: remote[0].latitude,
      longitude: remote[0].longitude,
      source: "nominatim" as const,
    };
  }

  throw new Error(`Город «${name}» не найден. Выберите из списка.`);
}

const NOMINATIM_TIMEOUT_MS = 4000;

// Запрашивает подсказки у OpenStreetMap Nominatim
async function fetchNominatim(query: string): Promise<PlaceSuggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("accept-language", "ru");
  url.searchParams.set("featuretype", "city");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

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
  }
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
