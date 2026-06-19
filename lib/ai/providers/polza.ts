import OpenAI from "openai";
import type { AiProvider } from "./types";

// Создаёт клиент Polza AI через OpenAI-совместимый API
export function createPolzaProvider(): AiProvider {
  const apiKey = process.env.POLZA_API_KEY;
  if (!apiKey) {
    throw new Error("POLZA_API_KEY не задан");
  }

  const baseURL = process.env.POLZA_BASE_URL || "https://polza.ai/api/v1";
  const model = process.env.POLZA_MODEL || "gpt-4o-mini";
  const client = new OpenAI({ apiKey, baseURL });

  return {
    name: "polza",
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
