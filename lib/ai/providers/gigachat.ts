import GigaChat from "gigachat";
import { Agent } from "node:https";
import type { AiProvider } from "./types";

// Создаёт клиент GigaChat через официальный SDK
export function createGigaChatProvider(): AiProvider {
  const credentials =
    process.env.GIGACHAT_API_KEY || process.env.GIGACHAT_CREDENTIALS;
  if (!credentials) {
    throw new Error("GIGACHAT_API_KEY или GIGACHAT_CREDENTIALS не задан");
  }

  const httpsAgent = new Agent({ rejectUnauthorized: false });
  const model = process.env.GIGACHAT_MODEL || "GigaChat";
  const client = new GigaChat({ credentials, model, httpsAgent });

  return {
    name: "gigachat",
    model,
    async chat(messages) {
      const response = await client.chat({
        messages: messages.map((m) => ({
          role: m.role as "system" | "user" | "assistant",
          content: m.content,
        })),
      });
      return response.choices?.[0]?.message?.content ?? "";
    },
  };
}
