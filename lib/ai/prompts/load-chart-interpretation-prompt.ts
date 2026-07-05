import { readFileSync } from "fs";
import { join } from "path";

// Читает шаблон промпта для первичной интерпретации карты
export function loadChartInterpretationPrompt(): string {
  const path = join(
    process.cwd(),
    "lib/ai/prompts/chart-interpretation.md"
  );
  return readFileSync(path, "utf-8");
}
