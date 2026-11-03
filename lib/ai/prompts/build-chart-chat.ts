import type { AiMessage } from "@/lib/ai/providers/types";
import { formatChartContextForAi, type PlanetDisplayRow, type HouseDisplayRow, type HousePlanetsDisplayRow } from "@/lib/astrology/chart-format";

type Context = {
  planetsDisplay: PlanetDisplayRow[];
  housesDisplay: HouseDisplayRow[];
  housesPlanetsDisplay: HousePlanetsDisplayRow[];
  interpretation?: string;
};
type HistoryMessage = { role: "user" | "assistant"; content: string };

// Структурированный контекст — только астрологические таблицы, без birthInput/API payload.
// Вопрос, прежний текст ИИ и переписка остаются свободным текстом обсуждения.
export function buildNatalChatMessages(context: Context, question: string, history: HistoryMessage[] = []): AiMessage[] {
  const chartText = formatChartContextForAi(context.planetsDisplay, context.housesDisplay, context.housesPlanetsDisplay);
  return [
    { role: "system", content: `Ты астролог-консультант. Отвечай на русском, опираясь только на данные натальной карты ниже.
Не вызывай внешние API и не выдумывай положения планет, знаки, дома или аспекты, которых нет в данных.
Без медицинских и фаталистических предсказаний. Кратко и по делу.` },
    { role: "user", content: `${chartText}\n\nИнтерпретация:\n${context.interpretation ?? "—"}` },
    ...history.slice(-6).map(message => ({ role: message.role, content: message.content })),
    { role: "user", content: question },
  ];
}
