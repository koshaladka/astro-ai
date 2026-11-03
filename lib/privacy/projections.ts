import type { ApiPayload } from "@/lib/schemas/birth-payload.zod";
import { BODY_NAMES, ASPECTS, type Position, type Aspect } from "@/lib/overlays/aspects";

// Явные проекции вместо JSON.stringify сохранённой записи целиком.
export function aiPosition(position: Position): Position {
  if (!Object.hasOwn(BODY_NAMES, position.id)) throw new Error("Неизвестное небесное тело");
  return { id: position.id, name: BODY_NAMES[position.id], longitude: position.longitude, retrograde: position.retrograde };
}
export function aiAspect(aspect: Aspect): Aspect {
  const definition = ASPECTS.find(item => item.id === aspect.type);
  if (!definition) throw new Error("Неизвестный тип аспекта");
  const natal = aiPosition(aspect.natal);
  const eclipse = aiPosition(aspect.eclipse);
  return { id: `${natal.id}:${eclipse.id}:${definition.id}`, natal, eclipse,
    type: definition.id, name: definition.name, angle: definition.angle, distance: aspect.distance, orb: aspect.orb };
}
export function aiHouses(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is { house: number; sign: string; degree: number } =>
    row !== null && typeof row === "object" && Number.isInteger(row.house) && row.house >= 1 && row.house <= 12 &&
    typeof row.sign === "string" && typeof row.degree === "number" && Number.isFinite(row.degree)
  ).map(row => ({ house: row.house, sign: row.sign, degree: row.degree }));
}
export function astrologyPayload(body: ApiPayload): ApiPayload {
  return {
    year: body.year, month: body.month, date: body.date, hours: body.hours,
    minutes: body.minutes, seconds: body.seconds, latitude: body.latitude,
    longitude: body.longitude, timezone: body.timezone,
    config: { observation_point: body.config.observation_point, ayanamsha: body.config.ayanamsha,
      house_system: body.config.house_system, language: body.config.language },
  };
}
