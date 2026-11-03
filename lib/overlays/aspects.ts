import type { EclipseType } from "./catalog";

export const BODY_NAMES = {
  Sun: "Солнце", Moon: "Луна", Mercury: "Меркурий", Venus: "Венера",
  Mars: "Марс", Jupiter: "Юпитер", Saturn: "Сатурн", Uranus: "Уран",
  Neptune: "Нептун", Pluto: "Плутон", "North Node": "Северный узел", "South Node": "Южный узел",
} as const;
export type BodyId = keyof typeof BODY_NAMES;
export type Position = { id: BodyId; name: string; longitude: number; retrograde: boolean };
export const ASPECTS = [
  { id: "conjunction", name: "Соединение", angle: 0 },
  { id: "sextile", name: "Секстиль", angle: 60 },
  { id: "square", name: "Квадрат", angle: 90 },
  { id: "trine", name: "Трин", angle: 120 },
  { id: "opposition", name: "Оппозиция", angle: 180 },
] as const;
export type Aspect = {
  id: string; natal: Position; eclipse: Position;
  type: typeof ASPECTS[number]["id"]; name: string; angle: number; distance: number; orb: number;
};
export type AspectType = typeof ASPECTS[number]["id"];
// Остальные формулы сохранены; возвращаем их явным изменением этой настройки.
export const ACTIVE_ASPECT_TYPES: readonly AspectType[] = ["conjunction"];
export const CALCULATION_VERSION = "geocentric-tropical-eclipse-luminary-five-aspects-orb5-v3";
export const ECLIPSE_ASPECT_TYPES: readonly AspectType[] = ASPECTS.map(a => a.id);
export function eclipseLuminary(type: EclipseType): "Sun" | "Moon" {
  if (type.startsWith("solar-")) return "Sun";
  if (type.startsWith("lunar-")) return "Moon";
  throw new Error("Неизвестный тип затмения");
}

// Правило затмений отдельно от общего калькулятора: источник — только Солнце/Луна.
export function calculateEclipseAspects(natal: Position[], transit: Position[], type: EclipseType): Aspect[] {
  const sourceId = eclipseLuminary(type);
  const source = transit.find(p => p.id === sourceId);
  if (!source) throw new Error(`В карте затмения отсутствует ${BODY_NAMES[sourceId]}`);
  return calculateAspects(natal, [source], ECLIPSE_ASPECT_TYPES);
}
export function activeAspects(aspects: Aspect[]): Aspect[] {
  return aspects.filter(a => ACTIVE_ASPECT_TYPES.includes(a.type) && Number.isFinite(a.orb) && a.orb >= 0 && a.orb <= 5);
}

export function angularDistance(a: number, b: number): number {
  if (![a, b].every(x => Number.isFinite(x) && x >= 0 && x < 360)) {
    throw new Error("Долгота должна быть числом от 0° до 360° (не включая 360°)");
  }
  const d = Math.abs(a - b);
  return Math.min(d, 360 - d);
}

// Исходные долготы, без округления текста таблиц. Неполный ответ API отклоняется.
export function extractPositions(raw: unknown): Position[] {
  const output = (raw as { output?: unknown })?.output;
  if (!Array.isArray(output)) throw new Error("API не вернул список положений планет");
  const found = new Map<BodyId, Position>();
  for (const row of output) {
    const r = row as { planet?: { en?: string }; fullDegree?: unknown; isRetro?: unknown };
    const id = r.planet?.en === "Mean Node" ? "North Node" : r.planet?.en;
    if (!id || !Object.hasOwn(BODY_NAMES, id) || id === "South Node") continue;
    const body = id as BodyId;
    if (typeof r.fullDegree !== "number") throw new Error(`Нет долготы: ${BODY_NAMES[body]}`);
    angularDistance(r.fullDegree, 0);
    if (found.has(body)) throw new Error(`Повтор тела в ответе API: ${body}`);
    found.set(body, { id: body, name: BODY_NAMES[body], longitude: r.fullDegree,
      retrograde: String(r.isRetro).toLowerCase() === "true" });
  }
  const north = found.get("North Node");
  if (north) found.set("South Node", { ...north, id: "South Node", name: BODY_NAMES["South Node"], longitude: (north.longitude + 180) % 360 });
  return (Object.keys(BODY_NAMES) as BodyId[]).map(id => {
    const p = found.get(id);
    if (!p) throw new Error(`В данных карты отсутствует ${BODY_NAMES[id]}`);
    return p;
  });
}

export function calculateAspects(
  natal: Position[], eclipse: Position[], enabledTypes: readonly AspectType[] = ACTIVE_ASPECT_TYPES,
): Aspect[] {
  const result: Aspect[] = [];
  for (const a of natal) for (const b of eclipse) {
    const distance = angularDistance(a.longitude, b.longitude);
    for (const aspect of ASPECTS) {
      if (!enabledTypes.includes(aspect.id)) continue;
      const orb = Math.abs(distance - aspect.angle);
      if (orb <= 5) result.push({ id: `${a.id}:${b.id}:${aspect.id}`, natal: a, eclipse: b,
        type: aspect.id, name: aspect.name, angle: aspect.angle, distance, orb });
    }
  }
  return result.sort((a, b) => a.orb - b.orb || a.id.localeCompare(b.id, "en"));
}

const SIGNS = ["Овен", "Телец", "Близнецы", "Рак", "Лев", "Дева", "Весы", "Скорпион", "Стрелец", "Козерог", "Водолей", "Рыбы"];
export function formatLongitude(longitude: number) {
  angularDistance(longitude, 0);
  return `${SIGNS[Math.floor(longitude / 30)]} ${(longitude % 30).toFixed(2)}°`;
}
