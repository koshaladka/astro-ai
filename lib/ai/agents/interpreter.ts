import { getAiProvider } from "@/lib/ai/providers";
import { tracedChat } from "@/lib/observability/langfuse";

type PlanetRow = {
  planet?: { ru?: string; en?: string };
  zodiac_sign?: { name?: { ru?: string } };
  isRetro?: string;
};

type HousesData = {
  output?: {
    Houses?: Array<{ House?: number; zodiac_sign?: { name?: { ru?: string } } }>;
    Ascendant?: { zodiac_sign?: { name?: { ru?: string } } };
    Midheaven?: { zodiac_sign?: { name?: { ru?: string } } };
  };
};

// Сжимает raw-ответ API для промпта интерпретатора
export function compressChartContext(planets: unknown, houses: unknown) {
  const planetRows = (planets as { output?: PlanetRow[] })?.output ?? [];
  const houseData = (houses as HousesData)?.output;

  const planetLines = planetRows
    .slice(0, 12)
    .map((p) => {
      const name = p.planet?.ru || p.planet?.en || "?";
      const sign = p.zodiac_sign?.name?.ru || "?";
      const retro = p.isRetro === "true" ? " (R)" : "";
      return `${name}: ${sign}${retro}`;
    })
    .join("\n");

  const asc = houseData?.Ascendant?.zodiac_sign?.name?.ru;
  const mc = houseData?.Midheaven?.zodiac_sign?.name?.ru;
  const houseLines =
    houseData?.Houses?.map(
      (h) => `Дом ${h.House}: ${h.zodiac_sign?.name?.ru ?? "?"}`
    ).join("\n") ?? "";

  return { planetLines, asc, mc, houseLines };
}

// Генерирует короткое описание натальной карты на русском
export async function interpretChart(
  planets: unknown,
  houses: unknown
): Promise<{ short: string; highlights: string[]; agentTrace: Record<string, string> }> {
  const provider = getAiProvider();
  const ctx = compressChartContext(planets, houses);

  const systemPrompt = `Ты астролог. Напиши краткое описание натальной карты на русском.
150–300 слов. Без медицинских и фаталистических предсказаний.
Структура: общий тон → сильные стороны → зоны внимания.`;

  const userPrompt = `Планеты:
${ctx.planetLines}

ASC: ${ctx.asc ?? "?"}
MC: ${ctx.mc ?? "?"}

Дома:
${ctx.houseLines}`;

  const { output, trace } = await tracedChat(
    provider,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { name: "interpreter", input: ctx }
  );

  const highlights = output
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 20)
    .slice(0, 4);

  return {
    short: output.trim(),
    highlights,
    agentTrace: trace,
  };
}

type ChartKnowledge = {
  planets: unknown;
  houses: unknown;
  interpretation?: string;
  apiPayload?: unknown;
  birthInput?: unknown;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

// Отвечает на вопрос по сохранённым данным карты без повторного вызова Astrology API
export async function askAboutChart(
  chart: ChartKnowledge,
  question: string,
  history: ChatMessage[] = []
): Promise<string> {
  const provider = getAiProvider();
  const ctx = compressChartContext(chart.planets, chart.houses);

  const systemPrompt = `Ты астролог-консультант. Отвечай на русском, опираясь только на данные натальной карты ниже.
Не вызывай внешние API и не выдумывай положения планет.
Без медицинских и фаталистических предсказаний. Кратко и по делу.`;

  const chartContext = `Данные рождения: ${JSON.stringify(chart.birthInput ?? {})}
API payload: ${JSON.stringify(chart.apiPayload ?? {})}

Планеты:
${ctx.planetLines}

ASC: ${ctx.asc ?? "?"}
MC: ${ctx.mc ?? "?"}

Дома:
${ctx.houseLines}

Интерпретация:
${chart.interpretation ?? "—"}`;

  const messages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: chartContext },
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
