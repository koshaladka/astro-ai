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
export const CALCULATION_VERSION = "geocentric-tropical-mean-node-five-aspects-orb5-v1";

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

export function calculateAspects(natal: Position[], eclipse: Position[]): Aspect[] {
  const result: Aspect[] = [];
  for (const a of natal) for (const b of eclipse) {
    const distance = angularDistance(a.longitude, b.longitude);
    for (const aspect of ASPECTS) {
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
