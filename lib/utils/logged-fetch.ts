import { randomUUID } from "node:crypto";
import { logApiRequest, logApiResponse } from "@/lib/utils/api-logger";

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

// Не читаем ни Request.body, ни Response.body ради диагностики.
export async function loggedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  step = "external.fetch",
  fetchFn: FetchFn = fetch
) {
  const requestId = randomUUID();
  const started = performance.now();
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  logApiRequest(step, { method, url: "", requestId });
  try {
    const response = await fetchFn(input, init);
    logApiResponse(step, { status: response.status, requestId, durationMs: performance.now() - started });
    return response;
  } catch (error) {
    logApiResponse(step, { status: 0, requestId, durationMs: performance.now() - started });
    throw error;
  }
}
