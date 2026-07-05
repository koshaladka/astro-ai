import { askAboutChart, interpretChart } from "@/lib/ai/agents/interpreter";
import { buildApiPayload } from "@/lib/ai/agents/request-builder";
import { fetchChartData } from "@/lib/astrology/client";
import { buildChartDisplay, buildHousesPlanetsDisplay, type HouseDisplayRow, type HousePlanetsDisplayRow, type PlanetDisplayRow } from "@/lib/astrology/chart-format";
import { connectDb } from "@/lib/db/connect";
import { ChartRequest } from "@/lib/db/models/ChartRequest";
import { ChartResult } from "@/lib/db/models/ChartResult";
import { Client, parseBirthInput } from "@/lib/db/models/Client";
import { User } from "@/lib/db/models/User";
import type { BirthInput } from "@/lib/schemas/birth-payload.zod";

// Сохраняет данные рождения (и имя, если передано) в профиль пользователя
async function saveUserBirthPreferences(
  userId: string,
  birthInput: BirthInput,
  name?: string
) {
  const update: Record<string, unknown> = {
    birthPreferences: {
      date: birthInput.date,
      time: birthInput.time,
      placeName: birthInput.placeName,
      latitude: birthInput.latitude,
      longitude: birthInput.longitude,
    },
  };
  if (name) update.name = name;

  await User.findByIdAndUpdate(userId, update);
}

export type ChartStatus =
  | "draft"
  | "validated"
  | "fetching"
  | "fetched"
  | "interpreted"
  | "error"
  | "complete";

// Приводит planetsDisplay из MongoDB к простому массиву для API и UI
function normalizePlanetsDisplay(
  rows: Array<{
    name: string;
    sign: string;
    degree: number;
    house?: number | null;
    isRetro?: boolean;
  }> | null | undefined
): PlanetDisplayRow[] {
  return (rows ?? [])
    .filter((row) => row.name !== "Истинный узел")
    .map((row) => ({
      name: row.name === "Средний узел" ? "Северный узел" : row.name,
      sign: row.sign,
      degree: row.degree,
      house: row.house ?? undefined,
      isRetro: Boolean(row.isRetro),
    }));
}

// Приводит housesDisplay из MongoDB к простому массиву для API и UI
function normalizeHousesDisplay(
  rows: Array<{
    house: number;
    sign: string;
    degree: number;
  }> | null | undefined
): HouseDisplayRow[] {
  return (rows ?? []).map((row) => ({
    house: row.house,
    sign: row.sign,
    degree: row.degree,
  }));
}

// Приводит housesPlanetsDisplay из MongoDB к простому массиву для API и ИИ
function normalizeHousesPlanetsDisplay(
  rows: Array<{
    house: number;
    title: string;
    sign: string;
    planets?: Array<
      | string
      | {
          name: string;
          sign: string;
          degree: number;
          isRetro?: boolean;
        }
      | null
    > | null;
  }> | null | undefined
): HousePlanetsDisplayRow[] {
  return (rows ?? []).map((row) => ({
    house: row.house,
    title: row.title,
    sign: row.sign,
    planets: (row.planets ?? [])
      .filter((planet): planet is NonNullable<typeof planet> => planet != null)
      .filter((planet) => typeof planet !== "string")
      .map((planet) => ({
        name: planet.name,
        sign: planet.sign,
        degree: planet.degree,
        isRetro: Boolean(planet.isRetro),
      })),
  }));
}

// Запускает полный pipeline: AI → API → интерпретация
export async function runChartPipeline(
  birthInput: BirthInput,
  userId: string,
  name?: string
) {
  await connectDb();

  const parsed = parseBirthInput(birthInput);
  await saveUserBirthPreferences(userId, parsed, name);
  const client = await Client.create({ birthInput: parsed, userId });

  const chartRequest = await ChartRequest.create({
    clientId: client._id,
    status: "draft",
  });

  const chartResult = await ChartResult.create({
    clientId: client._id,
    requestId: chartRequest._id,
    status: "pending",
  });

  try {
    const { payload, agentTrace } = await buildApiPayload(parsed);
    chartRequest.apiPayload = payload;
    chartRequest.agentTrace = agentTrace;
    chartRequest.status = "validated";
    await chartRequest.save();

    const { planets, houses } = await fetchChartData(payload);
    const { planetsDisplay, housesDisplay, housesPlanetsDisplay } =
      buildChartDisplay(planets, houses);
    chartResult.planets = planets;
    chartResult.houses = houses;
    chartResult.set("planetsDisplay", planetsDisplay);
    chartResult.set("housesDisplay", housesDisplay);
    chartResult.set("housesPlanetsDisplay", housesPlanetsDisplay);
    chartResult.raw = { planets, houses, apiPayload: payload };
    chartResult.status = "fetched";
    chartResult.fetchedAt = new Date();
    await chartResult.save();

    const interpretation = await interpretChart(
      planetsDisplay,
      housesDisplay,
      housesPlanetsDisplay
    );
    chartResult.interpretation = {
      short: interpretation.short,
      highlights: interpretation.highlights,
    };
    chartResult.status = "interpreted";
    chartResult.interpretedAt = new Date();
    await chartResult.save();

    return {
      chartId: chartResult._id.toString(),
      clientId: client._id.toString(),
      requestId: chartRequest._id.toString(),
      status: "complete" as ChartStatus,
      summary: interpretation.short,
      highlights: interpretation.highlights,
      planets,
      houses,
      apiPayload: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    chartRequest.status = "error";
    chartRequest.validationErrors = [message];
    chartResult.status = "error";
    chartResult.errorMessage = message;
    await Promise.all([chartRequest.save(), chartResult.save()]);
    throw error;
  }
}

// Возвращает статус и результат карты по id (только для владельца)
export async function getChartById(chartId: string, userId: string) {
  await connectDb();

  const result = await ChartResult.findById(chartId)
    .populate("clientId")
    .populate("requestId")
    .lean();

  if (!result) return null;

  const client = result.clientId as {
    birthInput?: unknown;
    userId?: string | null;
  } | null;

  if (client?.userId && client.userId !== userId) return null;

  const request = result.requestId as {
    status?: string;
    apiPayload?: unknown;
    validationErrors?: string[];
  } | null;

  let status: ChartStatus = "draft";
  if (result.status === "error" || request?.status === "error") status = "error";
  else if (result.status === "interpreted") status = "complete";
  else if (result.status === "fetched") status = "fetched";
  else if (request?.status === "validated") status = "validated";
  else status = "draft";

  return {
    chartId: result._id.toString(),
    status,
    birthInput: (result.clientId as { birthInput?: unknown })?.birthInput,
    summary: result.interpretation?.short,
    highlights: result.interpretation?.highlights,
    planets: result.planets,
    houses: result.houses,
    planetsDisplay: normalizePlanetsDisplay(result.planetsDisplay),
    housesDisplay: normalizeHousesDisplay(result.housesDisplay),
    housesPlanetsDisplay: normalizeHousesPlanetsDisplay(
      result.housesPlanetsDisplay as Parameters<
        typeof normalizeHousesPlanetsDisplay
      >[0]
    ),
    raw: result.raw,
    apiPayload: request?.apiPayload,
    messages: result.messages ?? [],
    error: result.errorMessage || request?.validationErrors?.[0],
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}

// Возвращает список карт текущего пользователя
export async function getUserCharts(userId: string) {
  await connectDb();

  const clients = await Client.find({ userId }).select("_id birthInput").lean();
  if (clients.length === 0) return [];

  const clientMap = new Map(clients.map((c) => [c._id.toString(), c]));
  const clientIds = clients.map((c) => c._id);

  const results = await ChartResult.find({ clientId: { $in: clientIds } })
    .sort({ createdAt: -1 })
    .select("_id status interpretation clientId createdAt planets houses planetsDisplay housesDisplay housesPlanetsDisplay")
    .lean();

  return results.map((r) => {
    const client = clientMap.get(String(r.clientId));
    const status = r.status === "interpreted" ? "complete" : r.status;

    return {
      chartId: r._id.toString(),
      status,
      summaryPreview: r.interpretation?.short?.slice(0, 120),
      birthInput: client?.birthInput,
      planets: r.planets,
      houses: r.houses,
      planetsDisplay: normalizePlanetsDisplay(r.planetsDisplay),
      housesDisplay: normalizeHousesDisplay(r.housesDisplay),
      housesPlanetsDisplay: normalizeHousesPlanetsDisplay(
        r.housesPlanetsDisplay as Parameters<
          typeof normalizeHousesPlanetsDisplay
        >[0]
      ),
      createdAt: r.createdAt,
    };
  });
}

// Отвечает на вопрос по сохранённой карте и сохраняет историю в БД
export async function askChartQuestion(chartId: string, userId: string, question: string) {
  await connectDb();

  const chart = await getChartById(chartId, userId);
  if (!chart) return null;
  if (chart.status !== "complete") {
    throw new Error("Карта ещё не готова для вопросов");
  }

  const history = (chart.messages ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const answer = await askAboutChart(
    {
      planetsDisplay: chart.planetsDisplay,
      housesDisplay: chart.housesDisplay,
      housesPlanetsDisplay: chart.housesPlanetsDisplay,
      planets: chart.planets,
      houses: chart.houses,
      interpretation: chart.summary ?? undefined,
      apiPayload: chart.apiPayload,
      birthInput: chart.birthInput,
    },
    question,
    history
  );

  await ChartResult.findByIdAndUpdate(chartId, {
    $push: {
      messages: [
        { role: "user", content: question, createdAt: new Date() },
        { role: "assistant", content: answer, createdAt: new Date() },
      ],
    },
  });

  return { question, answer };
}

// Перегенерирует описание карты через ИИ из сохранённых planets/houses
export async function regenerateChartInterpretation(chartId: string, userId: string) {
  await connectDb();

  const chart = await getChartById(chartId, userId);
  if (!chart) return null;

  if (!chart.planets || !chart.houses) {
    throw new Error("Нет данных карты для интерпретации");
  }

  const { planetsDisplay, housesDisplay, housesPlanetsDisplay } =
    chart.planetsDisplay &&
    chart.planetsDisplay.length > 0 &&
    chart.housesDisplay &&
    chart.housesDisplay.length > 0
      ? {
          planetsDisplay: chart.planetsDisplay,
          housesDisplay: chart.housesDisplay,
          housesPlanetsDisplay:
            chart.housesPlanetsDisplay && chart.housesPlanetsDisplay.length > 0
              ? chart.housesPlanetsDisplay
              : buildHousesPlanetsDisplay(
                  chart.planetsDisplay,
                  chart.housesDisplay
                ),
        }
      : buildChartDisplay(chart.planets, chart.houses);

  const interpretation = await interpretChart(
    planetsDisplay,
    housesDisplay,
    housesPlanetsDisplay
  );

  await ChartResult.findByIdAndUpdate(chartId, {
    planetsDisplay,
    housesDisplay,
    housesPlanetsDisplay,
    interpretation: {
      short: interpretation.short,
      highlights: interpretation.highlights,
    },
    status: "interpreted",
    interpretedAt: new Date(),
  });

  return {
    summary: interpretation.short,
    highlights: interpretation.highlights,
  };
}

// Пересчитывает planetsDisplay и housesDisplay для всех карт
export async function backfillChartDisplay() {
  await connectDb();

  const results = await ChartResult.find({
    planets: { $exists: true, $ne: null },
    houses: { $exists: true, $ne: null },
  }).select("_id planets houses");

  let updated = 0;

  for (const result of results) {
    const { planetsDisplay, housesDisplay, housesPlanetsDisplay } =
      buildChartDisplay(result.planets, result.houses);
    await ChartResult.findByIdAndUpdate(result._id, {
      planetsDisplay,
      housesDisplay,
      housesPlanetsDisplay,
    });
    updated++;
  }

  return { total: results.length, updated };
}
