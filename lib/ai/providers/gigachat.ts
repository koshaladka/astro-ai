import GigaChat from "gigachat";
import { randomUUID } from "node:crypto";
import { Agent } from "node:https";
import { logApiRequest, logApiResponse } from "@/lib/utils/api-logger";
import type { AiProvider } from "./types";
import { resolveAiModel } from "./openai-compatible";

// Создаёт клиент GigaChat через официальный SDK. Модель: AI_MODEL или GIGACHAT_MODEL.
export function createGigaChatProvider(): AiProvider {
  const credentials =
    process.env.GIGACHAT_API_KEY || process.env.GIGACHAT_CREDENTIALS;
  if (!credentials) {
    throw new Error("GIGACHAT_API_KEY или GIGACHAT_CREDENTIALS не задан");
  }

  const httpsAgent = new Agent({ rejectUnauthorized: false });
  const model = resolveAiModel(process.env.GIGACHAT_MODEL || "GigaChat");
  const client = new GigaChat({ credentials, model, httpsAgent });

  return {
    name: "gigachat",
    model,
    async chat(messages) {
      const payload = messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      }));

      const requestId = randomUUID();
      const started = performance.now();
      logApiRequest("gigachat.chat", { method: "POST", url: "", requestId });
      let output: string;
      try {
        const response = await client.chat({ messages: payload });
        output = response.choices?.[0]?.message?.content ?? "";
        logApiResponse("gigachat.chat", { status: 200, requestId, durationMs: performance.now() - started });
      } catch (error) {
        logApiResponse("gigachat.chat", { status: 0, requestId, durationMs: performance.now() - started });
        throw error;
      }

      return output;
    },
  };
}
