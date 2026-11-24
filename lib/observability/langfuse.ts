import { randomUUID } from "node:crypto";
import type { AiMessage, AiProvider } from "@/lib/ai/providers/types";
import { diagnosticOperation } from "@/lib/privacy/diagnostics";

type TraceMeta = { name: string; input: unknown };

async function recordMetadata(operation: string, requestId: string, durationMs: number, success: boolean) {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!publicKey || !secretKey) return;
  try {
    const { Langfuse } = await import("langfuse");
    const langfuse = new Langfuse({ publicKey, secretKey, baseUrl: process.env.LANGFUSE_BASE_URL });
    const metadata = { requestId, durationMs: Math.round(durationMs), success };
    // Нет input/output, prompt, messages, userId/sessionId или текста исключений.
    const trace = langfuse.trace({ name: operation, metadata });
    const generation = trace.generation({ name: "ai-call", metadata });
    generation.end({ metadata });
    await langfuse.shutdownAsync();
  } catch {
    // Сбой диагностики не должен терять ответ ИИ или писать содержимое ошибки в лог.
  }
}

async function boundedMetadata(operation: string, requestId: string, durationMs: number, success: boolean) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      recordMetadata(operation, requestId, durationMs, success),
      new Promise<void>(resolve => { timer = setTimeout(resolve, 1000); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

export async function tracedChat(provider: AiProvider, messages: AiMessage[], meta: TraceMeta): Promise<{
  output: string; trace: Record<string, string>;
}> {
  const requestId = randomUUID();
  const started = performance.now();
  const operation = diagnosticOperation(meta.name);
  let output: string;
  try {
    output = await provider.chat(messages);
  } catch (error) {
    await boundedMetadata(operation, requestId, performance.now() - started, false);
    throw error;
  }
  await boundedMetadata(operation, requestId, performance.now() - started, true);
  return { output, trace: { provider: provider.name, model: provider.model, promptVersion: "v1" } };
}
