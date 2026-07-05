import "dotenv/config";
import mongoose from "mongoose";
import { readFileSync } from "fs";

function formatPlanets(rows) {
  return rows
    .map((r) => {
      const retro = r.isRetro ? " (R)" : "";
      const house = r.house != null ? `, дом ${r.house}` : "";
      return `${r.name}: ${r.sign} ${r.degree.toFixed(1)}°${retro}${house}`;
    })
    .join("\n");
}

function formatHouses(rows) {
  return rows
    .map((r) => `Дом ${r.house}: ${r.sign} ${r.degree.toFixed(1)}°`)
    .join("\n");
}

function formatHousesPlanets(rows) {
  return rows
    .map((row) => {
      if (row.planets.length === 0) {
        return `${row.title} в знаке ${row.sign} — в ${row.house} доме планет нет`;
      }

      const planetsText = row.planets
        .map((planet) => {
          const retro = planet.isRetro ? " (R)" : "";
          return `${planet.name} ${planet.degree.toFixed(1)}° в знаке ${planet.sign}${retro}`;
        })
        .join(", ");

      return `${row.title} в знаке ${row.sign} — в ${row.house} доме: ${planetsText}`;
    })
    .join("\n");
}

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI не задан");

await mongoose.connect(uri);
const doc = await mongoose.connection.collection("chartresults").findOne(
  {},
  { sort: { createdAt: -1 } }
);

const pd = doc?.planetsDisplay ?? [];
const hd = doc?.housesDisplay ?? [];
const hpd = doc?.housesPlanetsDisplay ?? [];
const asc = hd.find((h) => h.house === 1)?.sign ?? "?";
const mc = hd.find((h) => h.house === 10)?.sign ?? "?";

const userPrompt = `Данные натальной карты:

Планеты:
${formatPlanets(pd)}

ASC: ${asc}
MC: ${mc}

Дома:
${formatHouses(hd)}

Дома и планеты в них:
${formatHousesPlanets(hpd)}`;

const systemPrompt = readFileSync(
  "lib/ai/prompts/chart-interpretation.md",
  "utf8"
);

console.log("=== SYSTEM ===");
console.log(systemPrompt);
console.log("\n=== USER ===");
console.log(userPrompt);

await mongoose.disconnect();
