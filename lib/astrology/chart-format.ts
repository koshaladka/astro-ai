type HouseCusp = {
  House?: number;
  degree?: number;
  normDegree?: number;
  zodiac_sign?: { name?: { ru?: string } };
};

type PlanetRow = {
  planet?: { ru?: string; en?: string };
  zodiac_sign?: { number?: number; name?: { ru?: string } };
  isRetro?: string;
  fullDegree?: number;
  normDegree?: number;
};

export type PlanetDisplayRow = {
  name: string;
  sign: string;
  degree: number;
  house?: number;
  isRetro: boolean;
};

export type HouseDisplayRow = {
  house: number;
  sign: string;
  degree: number;
};

export type HousePlanetsInHouseRow = {
  name: string;
  sign: string;
  degree: number;
  isRetro: boolean;
};

export type HousePlanetsDisplayRow = {
  house: number;
  title: string;
  sign: string;
  planets: HousePlanetsInHouseRow[];
};

const HOUSE_TITLES: Record<number, string> = {
  1: "Асцендент",
  4: "IC",
  7: "Десцендент",
  10: "MC",
};

const ZODIAC_SIGNS_RU: Record<number, string> = {
  1: "Овен",
  2: "Телец",
  3: "Близнецы",
  4: "Рак",
  5: "Лев",
  6: "Дева",
  7: "Весы",
  8: "Скорпион",
  9: "Стрелец",
  10: "Козерог",
  11: "Водолей",
  12: "Рыбы",
};

const PLANETS_HIDDEN_FROM_UI = new Set([
  "Ceres",
  "Vesta",
  "Juno",
  "Pallas",
  "Chiron",
  "True Node",
]);

// Проверяет, скрывать ли планету в таблице (в БД остаётся)
export function isPlanetHiddenFromUi(p: PlanetRow): boolean {
  return PLANETS_HIDDEN_FROM_UI.has(p.planet?.en ?? "");
}

// Возвращает подпись планеты для таблицы
export function getPlanetDisplayName(p: PlanetRow): string {
  const en = p.planet?.en;
  if (en === "MC" || en === "IC") return en;
  if (en === "Mean Node") return "Северный узел";
  return p.planet?.ru || p.planet?.en || "?";
}

// Возвращает противоположный знак по номеру (1–12)
function getOppositeSignRu(signNumber: number): string {
  const opposite = ((signNumber + 5) % 12) + 1;
  return ZODIAC_SIGNS_RU[opposite] ?? "?";
}

// Возвращает противоположный дом (1–12)
function getOppositeHouse(house: number): number {
  return ((house + 5) % 12) + 1;
}

// Добавляет южный узел как противоположность северного
function appendSouthNode(
  rows: PlanetDisplayRow[],
  planetRows: PlanetRow[],
  houseRows: HouseCusp[]
): PlanetDisplayRow[] {
  const meanNode = planetRows.find((p) => p.planet?.en === "Mean Node");
  if (!meanNode?.zodiac_sign?.number) return rows;

  const northHouse =
    meanNode.fullDegree != null
      ? findPlanetHouse(meanNode.fullDegree, houseRows)
      : undefined;

  const southRow: PlanetDisplayRow = {
    name: "Южный узел",
    sign: getOppositeSignRu(meanNode.zodiac_sign.number),
    degree: meanNode.normDegree ?? 0,
    house: northHouse != null ? getOppositeHouse(northHouse) : undefined,
    isRetro: meanNode.isRetro?.toLowerCase() === "true",
  };

  const result = rows.map((row) =>
    row.name === "Средний узел" ? { ...row, name: "Северный узел" } : row
  );

  if (result.some((row) => row.name === "Южный узел")) return result;

  const northIdx = result.findIndex((row) => row.name === "Северный узел");
  if (northIdx < 0) return [...result, southRow];

  const withSouth = [...result];
  withSouth.splice(northIdx + 1, 0, southRow);
  return withSouth;
}

// Определяет номер дома по абсолютному градусу планеты и куспидам домов
export function findPlanetHouse(
  planetDegree: number,
  houses: HouseCusp[]
): number | undefined {
  const cusps = houses
    .filter((h) => h.House != null && h.degree != null)
    .sort((a, b) => (a.House ?? 0) - (b.House ?? 0));

  if (cusps.length === 0) return undefined;

  for (let i = 0; i < cusps.length; i++) {
    const current = cusps[i].degree!;
    const next = cusps[(i + 1) % cusps.length].degree!;
    const houseNum = cusps[i].House!;

    if (next > current) {
      if (planetDegree >= current && planetDegree < next) return houseNum;
    } else if (planetDegree >= current || planetDegree < next) {
      return houseNum;
    }
  }

  return cusps[0].House;
}

// Собирает строки таблицы планет с номерами домов для сохранения в БД
export function buildPlanetsDisplay(
  planets: unknown,
  houses: unknown
): PlanetDisplayRow[] {
  const planetRows = (planets as { output?: PlanetRow[] })?.output ?? [];
  const houseRows =
    (houses as { output?: { Houses?: HouseCusp[] } })?.output?.Houses ?? [];

  return appendSouthNode(
    planetRows
      .filter((p) => !isPlanetHiddenFromUi(p))
      .map((p) => ({
        name: getPlanetDisplayName(p),
        sign: p.zodiac_sign?.name?.ru ?? "?",
        degree: p.normDegree ?? 0,
        house:
          p.fullDegree != null
            ? findPlanetHouse(p.fullDegree, houseRows)
            : undefined,
        isRetro: p.isRetro?.toLowerCase() === "true",
      })),
    planetRows,
    houseRows
  );
}

// Собирает строки таблицы домов для сохранения в БД
export function buildHousesDisplay(houses: unknown): HouseDisplayRow[] {
  const houseRows =
    (houses as { output?: { Houses?: HouseCusp[] } })?.output?.Houses ?? [];

  return houseRows
    .filter((h) => h.House != null)
    .map((h) => ({
      house: h.House!,
      sign: h.zodiac_sign?.name?.ru ?? "?",
      degree: h.normDegree ?? 0,
    }));
}

// Форматирует сохранённые строки домов в текст для промпта ИИ
export function formatHousesDisplayLines(rows: HouseDisplayRow[]): string {
  return rows
    .map((row) => `Дом ${row.house}: ${row.sign} ${row.degree.toFixed(1)}°`)
    .join("\n");
}

// Собирает по каждому дому знак и список планет внутри него
export function buildHousesPlanetsDisplay(
  planetsDisplay: PlanetDisplayRow[],
  housesDisplay: HouseDisplayRow[]
): HousePlanetsDisplayRow[] {
  return housesDisplay.map((house) => {
    const planets = planetsDisplay
      .filter((planet) => planet.house === house.house)
      .map((planet) => ({
        name: planet.name,
        sign: planet.sign,
        degree: planet.degree,
        isRetro: planet.isRetro,
      }));
    const houseTitle = HOUSE_TITLES[house.house];
    const title = houseTitle
      ? `${house.house} дом (${houseTitle})`
      : `${house.house} дом`;

    return {
      house: house.house,
      title,
      sign: house.sign,
      planets,
    };
  });
}

// Форматирует одну планету внутри дома для промпта ИИ
function formatPlanetInHouseLine(planet: HousePlanetsInHouseRow): string {
  const retro = planet.isRetro ? " (R)" : "";
  return `${planet.name} ${planet.degree.toFixed(1)}° в знаке ${planet.sign}${retro}`;
}

// Форматирует дома с планетами в текст для промпта ИИ
export function formatHousesPlanetsDisplayLines(
  rows: HousePlanetsDisplayRow[]
): string {
  return rows
    .map((row) => {
      if (row.planets.length === 0) {
        return `${row.title} в знаке ${row.sign} — в ${row.house} доме планет нет`;
      }

      const planetsText = row.planets
        .map((planet) => formatPlanetInHouseLine(planet))
        .join(", ");

      return `${row.title} в знаке ${row.sign} — в ${row.house} доме: ${planetsText}`;
    })
    .join("\n");
}

// Собирает обе таблицы для UI и БД
export function buildChartDisplay(planets: unknown, houses: unknown) {
  const planetsDisplay = buildPlanetsDisplay(planets, houses);
  const housesDisplay = buildHousesDisplay(houses);

  return {
    planetsDisplay,
    housesDisplay,
    housesPlanetsDisplay: buildHousesPlanetsDisplay(
      planetsDisplay,
      housesDisplay
    ),
  };
}

// Формирует единый блок планет и домов для любого запроса к ИИ
export function formatChartContextForAi(
  planetsDisplay: PlanetDisplayRow[],
  housesDisplay: HouseDisplayRow[],
  housesPlanetsDisplay: HousePlanetsDisplayRow[]
): string {
  const asc = housesDisplay.find((h) => h.house === 1)?.sign;
  const mc = housesDisplay.find((h) => h.house === 10)?.sign;

  return `Планеты:
${formatPlanetsDisplayLines(planetsDisplay)}

ASC: ${asc ?? "?"}
MC: ${mc ?? "?"}

Дома:
${formatHousesDisplayLines(housesDisplay)}

Дома и планеты в них:
${formatHousesPlanetsDisplayLines(housesPlanetsDisplay)}`;
}

// Форматирует сохранённые строки планет в текст для промпта ИИ
export function formatPlanetsDisplayLines(rows: PlanetDisplayRow[]): string {
  return rows
    .map((row) => {
      const retro = row.isRetro ? " (R)" : "";
      const house = row.house != null ? `, дом ${row.house}` : "";
      return `${row.name}: ${row.sign} ${row.degree.toFixed(1)}°${retro}${house}`;
    })
    .join("\n");
}

// Возвращает строки домов, ASC и MC для промпта ИИ
export function getHousesPromptContext(planets: unknown, houses: unknown) {
  const houseRows =
    (houses as { output?: { Houses?: HouseCusp[] } })?.output?.Houses ?? [];
  const planetRows = (planets as { output?: PlanetRow[] })?.output ?? [];

  const asc = houseRows.find((h) => h.House === 1);
  const mc =
    (houses as { output?: { Midheaven?: HouseCusp } })?.output?.Midheaven ??
    planetRows.find((p) => p.planet?.en === "MC");

  const ascSign = asc?.zodiac_sign?.name?.ru;
  const mcSign =
    (mc as HouseCusp)?.zodiac_sign?.name?.ru ??
    (mc as PlanetRow)?.zodiac_sign?.name?.ru;

  return {
    houseLines: houseRows.map(formatHouseLine).join("\n"),
    asc: ascSign,
    mc: mcSign,
  };
}

// Форматирует строку планеты для промпта и UI
export function formatPlanetLine(p: PlanetRow, houseNum?: number): string {
  const name = p.planet?.ru || p.planet?.en || "?";
  const sign = p.zodiac_sign?.name?.ru || "?";
  const retro = p.isRetro?.toLowerCase() === "true" ? " (R)" : "";
  const degree =
    p.normDegree != null ? ` ${p.normDegree.toFixed(1)}°` : "";
  const house = houseNum != null ? `, дом ${houseNum}` : "";

  return `${name}: ${sign}${degree}${retro}${house}`;
}

// Форматирует строку дома для промпта
export function formatHouseLine(h: HouseCusp): string {
  const sign = h.zodiac_sign?.name?.ru || "?";
  const degree =
    h.normDegree != null ? ` ${h.normDegree.toFixed(1)}°` : "";

  return `Дом ${h.House ?? "?"}: ${sign}${degree}`;
}

// Убирает служебные поля и готовит сырой ответ API для промпта интерпретатора
export function prepareChartDataForPrompt(planets: unknown, houses: unknown) {
  const planetsData = JSON.parse(JSON.stringify(planets)) as {
    output?: PlanetRow[];
    interpretation?: unknown;
    [key: string]: unknown;
  };
  const housesData = JSON.parse(JSON.stringify(houses)) as {
    output?: unknown;
    interpretation?: unknown;
    [key: string]: unknown;
  };

  delete planetsData.interpretation;
  delete housesData.interpretation;

  if (Array.isArray(planetsData.output)) {
    planetsData.output = planetsData.output
      .filter((p) => p.planet?.en !== "True Node")
      .map((p) => {
        if (p.planet?.en === "Mean Node") {
          return {
            ...p,
            planet: { en: "North Node", ru: "Северный узел (Раху)" },
          };
        }
        return p;
      });
  }

  return { planets: planetsData, houses: housesData };
}

// Сжимает planets/houses в текст для промпта интерпретатора
export function compressChartContext(planets: unknown, houses: unknown) {
  const planetRows = (planets as { output?: PlanetRow[] })?.output ?? [];
  const houseRows =
    (houses as { output?: { Houses?: HouseCusp[] } })?.output?.Houses ?? [];

  const planetLines = planetRows
    .filter((p) => p.fullDegree != null)
    .map((p) => formatPlanetLine(p, findPlanetHouse(p.fullDegree!, houseRows)))
    .join("\n");

  const asc = houseRows.find((h) => h.House === 1);
  const mc =
    (houses as { output?: { Midheaven?: HouseCusp } })?.output?.Midheaven ??
    planetRows.find((p) => p.planet?.en === "MC");

  const ascSign = asc?.zodiac_sign?.name?.ru;
  const mcSign =
    (mc as HouseCusp)?.zodiac_sign?.name?.ru ??
    (mc as PlanetRow)?.zodiac_sign?.name?.ru;

  const houseLines = houseRows.map(formatHouseLine).join("\n");

  return {
    planetLines,
    asc: ascSign,
    mc: mcSign,
    houseLines,
    houseRows,
    planetRows,
  };
}
