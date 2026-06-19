import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MOCK_DIR = join(ROOT, "mock");
const REQUEST_TEMPLATE = join(MOCK_DIR, "request-body.json");

const API_URLS = {
  planet: "https://json.freeastrologyapi.com/western/planets",
  houses: "https://json.freeastrologyapi.com/western/houses",
};

// Разбирает аргументы CLI: эндпоинт (planet/houses) и вариант (geocentric/topocentric)
function parseArgs(argv) {
  const args = argv.slice(2);
  let endpoint = "planet";
  let variant = "geocentric";

  for (const arg of args) {
    if (arg === "planet" || arg === "planets") endpoint = "planet";
    else if (arg === "houses") endpoint = "houses";
    else if (arg === "topocentric" || arg === "geocentric") variant = arg;
  }

  return { endpoint, variant };
}

// Формирует суффикс имени файла из даты и времени рождения
function buildDateTimeSuffix(body) {
  const pad = (n) => String(n).padStart(2, "0");
  const { year, month, date, hours, minutes, seconds } = body;
  return `${year}-${pad(month)}-${pad(date)}_${pad(hours)}-${pad(minutes)}-${pad(seconds)}`;
}

// Собирает тело запроса: базовые данные + observation_point по варианту
function buildRequestBody(variant) {
  const body = JSON.parse(readFileSync(REQUEST_TEMPLATE, "utf-8"));
  body.config.observation_point = variant === "topocentric" ? "topocentric" : "geocentric";
  return body;
}

// Сохраняет данные в мок-файл с префиксом эндпоинта, датой и вариантом в имени
function saveMock(body, variant, endpoint, type, data) {
  const suffix = buildDateTimeSuffix(body);
  const filename = `${endpoint}-${type}-${suffix}-${variant}.json`;
  const path = join(MOCK_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
  return filename;
}

// Возвращает ключ Astrology API из .env (ASTROLOGY_API_KEY или устаревший API_KEY)
function getAstrologyApiKey() {
  const key = process.env.ASTROLOGY_API_KEY || process.env.API_KEY;
  if (!key || key === "YOUR_API_KEY_HERE") {
    throw new Error("Добавь ASTROLOGY_API_KEY в файл .env");
  }
  return key;
}

// Запрашивает данные у Western Astrology API (planets или houses)
async function fetchWestern(endpoint, body) {
  const apiKey = getAstrologyApiKey();

  const response = await fetch(API_URLS[endpoint], {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ошибка ${response.status}: ${text}`);
  }

  return response.json();
}

// Точка входа: читает мок, дергает API, логирует и сохраняет ответ
async function main() {
  const { endpoint, variant } = parseArgs(process.argv);
  const requestBody = buildRequestBody(variant);

  console.log(`Эндпоинт: ${endpoint}`);
  console.log(`Вариант: ${variant}`);
  console.log("Запрос:", JSON.stringify(requestBody, null, 2));

  const data = await fetchWestern(endpoint, requestBody);
  console.log("Ответ:", JSON.stringify(data, null, 2));

  const requestFile = saveMock(requestBody, variant, endpoint, "request", requestBody);
  const responseFile = saveMock(requestBody, variant, endpoint, "response", data);
  console.log(`Запрос сохранён в mock/${requestFile}`);
  console.log(`Ответ сохранён в mock/${responseFile}`);
}

main().catch((err) => {
  console.error(err.message);
  if (err.cause) console.error("Причина:", err.cause.message || err.cause);
  process.exit(1);
});
