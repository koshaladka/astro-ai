import { createGigaChatProvider } from "./gigachat";
import { createMockProvider } from "./mock";
import { createPolzaProvider } from "./polza";
import type { AiProvider } from "./types";

// Выбирает AI-провайдер по переменной AI_PROVIDER
export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER || "mock";

  switch (provider) {
    case "gigachat":
      return createGigaChatProvider();
    case "polza":
      return createPolzaProvider();
    case "mock":
    default:
      return createMockProvider();
  }
}
