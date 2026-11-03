import OpenAI from "openai";
import type { AiProvider } from "./types";
import { loggedFetch } from "@/lib/utils/logged-fetch";

/** Единая точка имени модели: AI_MODEL, иначе fallback провайдера. */
export function resolveAiModel(fallback: string): string {
  const fromEnv = process.env.AI_MODEL?.trim();
  return fromEnv || fallback;
}

type OpenAICompatibleOptions = {
  name: string;
  apiKey: string;
  baseURL: string;
  /** Дефолт модели, если AI_MODEL не задан */
  defaultModel: string;
};

/** Общий клиент для OpenAI-совместимых API (Polza, DeepSeek, …). */
export function createOpenAICompatibleProvider(
  opts: OpenAICompatibleOptions
): AiProvider {
  const model = resolveAiModel(opts.defaultModel);
  const client = new OpenAI({
    apiKey: opts.apiKey,
    baseURL: opts.baseURL,
    fetch: loggedFetch,
  });

  return {
    name: opts.name,
    model,
    async chat(messages) {
      const response = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({
          role: m.role as "system" | "user" | "assistant",
          content: m.content,
        })),
      });
      return response.choices[0]?.message?.content ?? "";
    },
  };
}
