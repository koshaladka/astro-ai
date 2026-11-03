import type { AiProvider } from "./types";
import { createOpenAICompatibleProvider } from "./openai-compatible";

// Polza AI — OpenAI-совместимый API. Модель: AI_MODEL или POLZA_MODEL.
export function createPolzaProvider(): AiProvider {
  const apiKey = process.env.POLZA_API_KEY;
  if (!apiKey) {
    throw new Error("POLZA_API_KEY не задан");
  }

  return createOpenAICompatibleProvider({
    name: "polza",
    apiKey,
    baseURL: process.env.POLZA_BASE_URL || "https://polza.ai/api/v1",
    defaultModel: process.env.POLZA_MODEL || "gpt-4o-mini",
  });
}
