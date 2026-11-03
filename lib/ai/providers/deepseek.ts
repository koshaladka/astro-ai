import type { AiProvider } from "./types";
import { createOpenAICompatibleProvider } from "./openai-compatible";

// DeepSeek — OpenAI-совместимый API. Модель: AI_MODEL или DEEPSEEK_MODEL.
export function createDeepSeekProvider(): AiProvider {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY не задан");
  }

  return createOpenAICompatibleProvider({
    name: "deepseek",
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    defaultModel: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  });
}
