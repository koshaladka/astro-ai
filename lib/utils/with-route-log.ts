import { randomUUID } from "node:crypto";
import { logApiRequest, logApiResponse } from "@/lib/utils/api-logger";

type RouteContext = { params?: Promise<Record<string, string>> };
type RouteHandler = (request: Request, context?: RouteContext) => Promise<Response> | Response;

export function withRouteLog(step: string, handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    const requestId = randomUUID();
    const started = performance.now();
    logApiRequest(step, { method: request.method, url: "", requestId });
    try {
      const response = await handler(request, context);
      logApiResponse(step, { status: response.status, requestId, durationMs: performance.now() - started });
      return response;
    } catch (error) {
      logApiResponse(step, { status: 500, requestId, durationMs: performance.now() - started });
      throw error;
    }
  };
}
