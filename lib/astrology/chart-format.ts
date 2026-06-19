type HouseCusp = {
  House?: number;
  degree?: number;
  normDegree?: number;
  zodiac_sign?: { name?: { ru?: string } };
};

type PlanetRow = {
  planet?: { ru?: string; en?: string };
  zodiac_sign?: { name?: { ru?: string } };
  isRetro?: string;
  fullDegree?: number;
  normDegree?: number;
};

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
