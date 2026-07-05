import "dotenv/config";
import mongoose from "mongoose";

const PLANETS_HIDDEN = new Set(["Ceres", "Vesta", "Juno", "Pallas", "Chiron", "True Node"]);

const ZODIAC_SIGNS_RU = {
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

function getPlanetDisplayName(p) {
  const en = p.planet?.en;
  if (en === "MC" || en === "IC") return en;
  if (en === "Mean Node") return "Северный узел";
  return p.planet?.ru || p.planet?.en || "?";
}

function getOppositeSignRu(signNumber) {
  const opposite = ((signNumber + 5) % 12) + 1;
  return ZODIAC_SIGNS_RU[opposite] ?? "?";
}

function getOppositeHouse(house) {
  return ((house + 5) % 12) + 1;
}

function findPlanetHouse(planetDegree, houses) {
  const cusps = houses
    .filter((h) => h.House != null && h.degree != null)
    .sort((a, b) => (a.House ?? 0) - (b.House ?? 0));

  if (cusps.length === 0) return undefined;

  for (let i = 0; i < cusps.length; i++) {
    const current = cusps[i].degree;
    const next = cusps[(i + 1) % cusps.length].degree;
    const houseNum = cusps[i].House;

    if (next > current) {
      if (planetDegree >= current && planetDegree < next) return houseNum;
    } else if (planetDegree >= current || planetDegree < next) {
      return houseNum;
    }
  }

  return cusps[0].House;
}

function appendSouthNode(rows, planetRows, houseRows) {
  const meanNode = planetRows.find((p) => p.planet?.en === "Mean Node");
  if (!meanNode?.zodiac_sign?.number) return rows;

  const northHouse =
    meanNode.fullDegree != null
      ? findPlanetHouse(meanNode.fullDegree, houseRows)
      : undefined;

  const southRow = {
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

function buildPlanetsDisplay(planets, houses) {
  const planetRows = planets?.output ?? [];
  const houseRows = houses?.output?.Houses ?? [];

  const rows = planetRows
    .filter((p) => !PLANETS_HIDDEN.has(p.planet?.en ?? ""))
    .map((p) => ({
      name: getPlanetDisplayName(p),
      sign: p.zodiac_sign?.name?.ru ?? "?",
      degree: p.normDegree ?? 0,
      house:
        p.fullDegree != null ? findPlanetHouse(p.fullDegree, houseRows) : undefined,
      isRetro: p.isRetro?.toLowerCase() === "true",
    }));

  return appendSouthNode(rows, planetRows, houseRows);
}

function buildHousesDisplay(houses) {
  const houseRows = houses?.output?.Houses ?? [];

  return houseRows
    .filter((h) => h.House != null)
    .map((h) => ({
      house: h.House,
      sign: h.zodiac_sign?.name?.ru ?? "?",
      degree: h.normDegree ?? 0,
    }));
}

function buildHousesPlanetsDisplay(planetsDisplay, housesDisplay) {
  const HOUSE_TITLES = { 1: "Асцендент", 4: "IC", 7: "Десцендент", 10: "MC" };

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

function formatPlanetInHouseLine(planet) {
  const retro = planet.isRetro ? " (R)" : "";
  return `${planet.name} ${planet.degree.toFixed(1)}° в знаке ${planet.sign}${retro}`;
}

function formatHousesPlanets(rows) {
  return rows
    .map((row) => {
      if (row.planets.length === 0) {
        return `${row.title} в знаке ${row.sign} — в ${row.house} доме планет нет`;
      }

      const planetsText = row.planets.map(formatPlanetInHouseLine).join(", ");
      return `${row.title} в знаке ${row.sign} — в ${row.house} доме: ${planetsText}`;
    })
    .join("\n");
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI не задан в .env");

  await mongoose.connect(uri);

  const collection = mongoose.connection.collection("chartresults");
  const results = await collection
    .find({ planets: { $exists: true, $ne: null }, houses: { $exists: true, $ne: null } })
    .project({ planets: 1, houses: 1 })
    .toArray();

  let updated = 0;

  for (const doc of results) {
    const planetsDisplay = buildPlanetsDisplay(doc.planets, doc.houses);
    const housesDisplay = buildHousesDisplay(doc.houses);
    const housesPlanetsDisplay = buildHousesPlanetsDisplay(
      planetsDisplay,
      housesDisplay
    );
    await collection.updateOne(
      { _id: doc._id },
      { $set: { planetsDisplay, housesDisplay, housesPlanetsDisplay } }
    );
    updated++;
  }

  console.log(`Готово: обновлено ${updated} из ${results.length} карт`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
