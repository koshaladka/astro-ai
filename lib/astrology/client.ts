import { readFileSync } from "fs";
import { join } from "path";
import type { ApiPayload } from "@/lib/schemas/birth-payload.zod";
import { proxyFetch } from "@/lib/utils/proxy-fetch";

const API_URLS = {
  planets: "https://json.freeastrologyapi.com/western/planets",
  houses: "https://json.freeastrologyapi.com/western/houses",
};

// Возвращает ключ Astrology API из .env
function getAstrologyApiKey() {
  const key = process.env.ASTROLOGY_API_KEY || process.env.API_KEY;
  if (!key || key === "YOUR_API_KEY_HERE") return null;
  return key;
}

// Проверяет, нужно ли использовать моки вместо реального API
export function shouldUseMockAstrology() {
  if (process.env.ASTROLOGY_USE_MOCK === "true") return true;
  if (process.env.AI_PROVIDER === "mock") return true;
  if (!getAstrologyApiKey()) return true;
  return false;
}

// Читает мок-ответ из папки mock/
function readMockFile(name: string) {
  const path = join(process.cwd(), "mock", name);
  return JSON.parse(readFileSync(path, "utf-8"));
}

// Запрашивает данные у Western Astrology API
async function fetchEndpoint(url: string, body: ApiPayload) {
  const apiKey = getAstrologyApiKey();
  if (!apiKey) {
    throw new Error("ASTROLOGY_API_KEY не задан в .env");
  }

  const response = await proxyFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Astrology API ${response.status}: ${text}`);
  }

  return response.json();
}

// Получает положение планет
export async function fetchPlanets(body: ApiPayload) {
  if (shouldUseMockAstrology()) {
    return readMockFile("response-1984-04-20_11-30-00-geocentric.json");
  }
  return fetchEndpoint(API_URLS.planets, body);
}

// Получает дома гороскопа
export async function fetchHouses(body: ApiPayload) {
  if (shouldUseMockAstrology()) {
    return readMockFile("houses-response-1984-04-20_11-30-00-geocentric.json");
  }
  return fetchEndpoint(API_URLS.houses, body);
}

// Запрашивает planets и houses параллельно
export async function fetchChartData(body: ApiPayload) {
  const [planets, houses] = await Promise.all([
    fetchPlanets(body),
    fetchHouses(body),
  ]);
  return { planets, houses };
}
