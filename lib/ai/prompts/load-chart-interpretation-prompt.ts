import { CHART_INTERPRETATION_PROMPT } from "@/lib/ai/prompts/chart-interpretation";

// Возвращает шаблон промпта для первичной интерпретации карты (из бандла, без чтения файла)
export function loadChartInterpretationPrompt(): string {
  return CHART_INTERPRETATION_PROMPT;
}
