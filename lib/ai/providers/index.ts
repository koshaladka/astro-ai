import { createDeepSeekProvider } from "./deepseek";
import { createGigaChatProvider } from "./gigachat";
import { createMockProvider } from "./mock";
import { createPolzaProvider } from "./polza";
import type { AiProvider } from "./types";

// Выбирает AI-провайдер по AI_PROVIDER. Модель — AI_MODEL (одно место).
export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER || "mock";

  switch (provider) {
    case "deepseek":
      return createDeepSeekProvider();
    case "gigachat":
      return createGigaChatProvider();
    case "polza":
      return createPolzaProvider();
    case "mock":
    default:
      return createMockProvider();
  }
}
