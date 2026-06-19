import { getAiProvider } from "@/lib/ai/providers";
import { tracedChat } from "@/lib/observability/langfuse";
import {
  validateApiPayload,
  type ApiPayload,
  type BirthInput,
} from "@/lib/schemas/birth-payload.zod";
import { geocodePlace } from "@/lib/utils/places";
import { resolveTimezone } from "@/lib/utils/timezone";

const SYSTEM_PROMPT = `Ты астрологический ассистент. Собери JSON для Free Astrology API.
Правила:
- hours/minutes — местное время на часах, не UTC
- timezone — числовое смещение UTC (Москва апрель 1984 → 4)
- observation_point: geocentric, ayanamsha: tropical, house_system: Placidus, language: ru
- Ответь ТОЛЬКО валидным JSON без markdown.`;

// Собирает JSON для Astrology API из ввода пользователя
export async function buildApiPayload(input: BirthInput): Promise<{
  payload: ApiPayload;
  agentTrace: Record<string, string>;
}> {
  const provider = getAiProvider();
  const geo = await geocodePlace(input.placeName, {
    latitude: input.latitude,
    longitude: input.longitude,
  });
  const timezone = resolveTimezone(
    geo.latitude,
    geo.longitude,
    `${input.date}T${input.time}:00`
  );

  const userPrompt = `Данные рождения:
- дата: ${input.date}
- время (местное): ${input.time}
- место: ${input.placeName}
- широта: ${geo.latitude}
- долгота: ${geo.longitude}
- timezone (UTC offset): ${timezone}

Сформируй JSON для Free Astrology API.`;

  const { output, trace } = await tracedChat(
    provider,
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    { name: "request-builder", input }
  );

  let parsed: unknown;
  try {
    const cleaned = output.replace(/```json\n?|\n?```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = buildFallbackPayload(input, geo.latitude, geo.longitude, timezone);
  }

  try {
    const payload = validateApiPayload(parsed);
    return { payload, agentTrace: trace };
  } catch {
    const payload = validateApiPayload(
      buildFallbackPayload(input, geo.latitude, geo.longitude, timezone)
    );
    return { payload, agentTrace: trace };
  }
}

// Собирает payload без LLM, если парсинг не удался
function buildFallbackPayload(
  input: BirthInput,
  latitude: number,
  longitude: number,
  timezone: number
): ApiPayload {
  const [year, month, date] = input.date.split("-").map(Number);
  const [hours, minutes] = input.time.split(":").map(Number);

  return {
    year,
    month,
    date,
    hours,
    minutes,
    seconds: 0,
    latitude,
    longitude,
    timezone,
    config: {
      observation_point: "geocentric",
      ayanamsha: "tropical",
      house_system: "Placidus",
      language: "ru",
    },
  };
}
