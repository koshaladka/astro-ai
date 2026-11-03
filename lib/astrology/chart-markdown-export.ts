import type { HouseDisplayRow, PlanetDisplayRow } from "./chart-format";
import {
  formatHousesDisplayLines,
  formatPlanetsDisplayLines,
} from "./chart-format";

type ChartMarkdownInput = {
  summary: string;
  highlights?: string[];
  birthInput?: { date?: string; time?: string; placeName?: string };
  planetsDisplay?: PlanetDisplayRow[];
  housesDisplay?: HouseDisplayRow[];
};

// Собирает markdown-файл с описанием натальной карты для скачивания
export function buildChartMarkdown(input: ChartMarkdownInput): string {
  const parts: string[] = ["# Натальная карта", ""];

  if (input.birthInput) {
    const line = [input.birthInput.date, input.birthInput.time, input.birthInput.placeName]
      .filter(Boolean)
      .join(" · ");
    if (line) parts.push(line, "");
  }

  if (input.planetsDisplay?.length) {
    parts.push("## Планеты", "", formatPlanetsDisplayLines(input.planetsDisplay), "");
  }

  if (input.housesDisplay?.length) {
    parts.push("## Дома", "", formatHousesDisplayLines(input.housesDisplay), "");
  }

  parts.push("## Описание", "", input.summary);


  return parts.join("\n");
}

// Запускает скачивание текста как markdown-файл в браузере
export function downloadMarkdownFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
