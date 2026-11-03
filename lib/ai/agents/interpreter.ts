import { loadChartInterpretationPrompt } from "@/lib/ai/prompts/load-chart-interpretation-prompt";
import { getAiProvider } from "@/lib/ai/providers";
import {
  type HouseDisplayRow,
  type HousePlanetsDisplayRow,
  type PlanetDisplayRow,
  buildChartDisplay,
  buildHousesPlanetsDisplay,
  formatChartContextForAi,
} from "@/lib/astrology/chart-format";
import { tracedChat } from "@/lib/observability/langfuse";

const PROMPT_VERSION = "v2-planet-paragraphs";

// Генерирует описание натальной карты по сохранённым таблицам планет и домов
export async function interpretChart(
  planetsDisplay: PlanetDisplayRow[],
  housesDisplay: HouseDisplayRow[],
  housesPlanetsDisplay: HousePlanetsDisplayRow[]
): Promise<{ short: string; highlights: string[]; agentTrace: Record<string, string> }> {
  const provider = getAiProvider();
  const chartContext = formatChartContextForAi(
    planetsDisplay,
    housesDisplay,
    housesPlanetsDisplay
  );
  const systemPrompt = loadChartInterpretationPrompt();
  const userPrompt = `Данные натальной карты:

${chartContext}`;

  const { output, trace } = await tracedChat(
    provider,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      name: "interpreter",
      input: {
        planetsDisplay,
        housesDisplay,
        housesPlanetsDisplay,
        promptVersion: PROMPT_VERSION,
      },
    }
  );


  return {
    short: output.trim(),
    highlights: [],
    agentTrace: { ...trace, promptVersion: PROMPT_VERSION },
  };
}

type ChartKnowledge = {
  planetsDisplay?: PlanetDisplayRow[];
  housesDisplay?: HouseDisplayRow[];
  housesPlanetsDisplay?: HousePlanetsDisplayRow[];
  planets?: unknown;
  houses?: unknown;
  interpretation?: string;
  apiPayload?: unknown;
  birthInput?: unknown;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

// Возвращает сохранённые таблицы или собирает их из сырых данных API
function resolveChartDisplay(chart: ChartKnowledge) {
  if (chart.planets && chart.houses) {
    const built = buildChartDisplay(chart.planets, chart.houses);

    if (
      chart.planetsDisplay &&
      chart.planetsDisplay.length > 0 &&
      chart.housesDisplay &&
      chart.housesDisplay.length > 0
    ) {
      return {
        planetsDisplay: chart.planetsDisplay,
        housesDisplay: chart.housesDisplay,
        housesPlanetsDisplay:
          chart.housesPlanetsDisplay && chart.housesPlanetsDisplay.length > 0
            ? chart.housesPlanetsDisplay
            : buildHousesPlanetsDisplay(
                chart.planetsDisplay,
                chart.housesDisplay
              ),
      };
    }

    return built;
  }

  if (
    chart.planetsDisplay &&
    chart.planetsDisplay.length > 0 &&
    chart.housesDisplay &&
    chart.housesDisplay.length > 0
  ) {
    return {
      planetsDisplay: chart.planetsDisplay,
      housesDisplay: chart.housesDisplay,
      housesPlanetsDisplay:
        chart.housesPlanetsDisplay && chart.housesPlanetsDisplay.length > 0
          ? chart.housesPlanetsDisplay
          : buildHousesPlanetsDisplay(
              chart.planetsDisplay,
              chart.housesDisplay
            ),
    };
  }

  return {
    planetsDisplay: [],
    housesDisplay: [],
    housesPlanetsDisplay: [],
  };
}

// Отвечает на вопрос по сохранённым данным карты без повторного вызова Astrology API
export async function askAboutChart(
  chart: ChartKnowledge,
  question: string,
  history: ChatMessage[] = []
): Promise<string> {
  const provider = getAiProvider();
  const { planetsDisplay, housesDisplay, housesPlanetsDisplay } =
    resolveChartDisplay(chart);
  const chartContext = formatChartContextForAi(
    planetsDisplay,
    housesDisplay,
    housesPlanetsDisplay
  );

  const systemPrompt = `Ты астролог-консультант. Отвечай на русском, опираясь только на данные натальной карты ниже.
Не вызывай внешние API и не выдумывай положения планет, знаки, дома или аспекты, которых нет в данных.
Без медицинских и фаталистических предсказаний. Кратко и по делу.`;

  const userContext = `Данные рождения: ${JSON.stringify(chart.birthInput ?? {})}

${chartContext}

Интерпретация:
${chart.interpretation ?? "—"}`;

  const messages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContext },
  ];

  for (const msg of history.slice(-6)) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: "user", content: question });

  const { output } = await tracedChat(provider, messages, {
    name: "chart-qa",
    input: { question, historyLength: history.length },
  });

  return output.trim();
}
