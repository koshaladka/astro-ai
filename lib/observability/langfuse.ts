import { Langfuse } from "langfuse";
import type { AiMessage } from "@/lib/ai/providers/types";
import type { AiProvider } from "@/lib/ai/providers/types";

type TraceMeta = {
  name: string;
  input: unknown;
};

// Оборачивает вызов AI в Langfuse trace или no-op
export async function tracedChat(
  provider: AiProvider,
  messages: AiMessage[],
  meta: TraceMeta
): Promise<{ output: string; trace: Record<string, string> }> {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;

  if (!publicKey || !secretKey) {
    const output = await provider.chat(messages);
    return {
      output,
      trace: {
        provider: provider.name,
        model: provider.model,
        promptVersion: "v1",
      },
    };
  }

  const langfuse = new Langfuse({
    publicKey,
    secretKey,
    baseUrl: process.env.LANGFUSE_BASE_URL,
  });

  const trace = langfuse.trace({ name: meta.name, input: meta.input });
  const generation = trace.generation({
    name: provider.name,
    model: provider.model,
    input: messages,
  });

  const output = await provider.chat(messages);
  generation.end({ output });
  await langfuse.shutdownAsync();

  return {
    output,
    trace: {
      provider: provider.name,
      model: provider.model,
      promptVersion: "v1",
    },
  };
}
