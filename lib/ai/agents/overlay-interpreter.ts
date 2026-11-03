import { getAiProvider } from "@/lib/ai/providers";
import { tracedChat } from "@/lib/observability/langfuse";
import type { OverlayRecord } from "@/lib/db/models/Overlay";
import { buildOverlayMessages } from "@/lib/overlays/prompt";
import { OverlayError } from "@/lib/overlays/errors";

export async function interpretOverlayData(overlay: OverlayRecord, question?: string, aspectId?: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      tracedChat(getAiProvider(), buildOverlayMessages(overlay, question, aspectId), {
        name: question === undefined ? "overlay-interpretation" : "overlay-qa",
        input: { calculationVersion: overlay.calculationVersion, aspectCount: overlay.aspects.length, aspectId },
      }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new OverlayError("ИИ не ответил вовремя. Повторите запрос.", 504)), 120_000); }),
    ]);
    if (!result.output.trim()) throw new OverlayError("ИИ вернул пустой ответ. Повторите запрос.", 502);
    return result.output.trim();
  } finally { if (timeout) clearTimeout(timeout); }
}
