import {
  validateApiPayload,
  type ApiPayload,
  type BirthInput,
} from "@/lib/schemas/birth-payload.zod";
import { geocodePlace } from "@/lib/utils/places";
import { resolveTimezone } from "@/lib/utils/timezone";

// Собирает JSON для Astrology API из ввода пользователя
export async function buildApiPayload(input: BirthInput): Promise<{
  payload: ApiPayload;
  agentTrace: Record<string, string>;
}> {
  const geo = await geocodePlace(input.placeName, {
    latitude: input.latitude,
    longitude: input.longitude,
  });

  const datetime = `${input.date}T${input.time}:00`;
  const timezone = resolveTimezone(geo.latitude, geo.longitude, datetime);

  const payload = {
    ...validateApiPayload(
      buildApiPayloadFromInput(input, geo.latitude, geo.longitude, timezone)
    ),
    timezone,
  };

  return { payload, agentTrace: {} };
}

// Собирает payload из данных рождения без LLM
function buildApiPayloadFromInput(
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
