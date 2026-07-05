import { logApiRequest, logApiResponse } from "@/lib/utils/api-logger";

type RouteContext = { params?: Promise<Record<string, string>> };
type RouteHandler = (
  request: Request,
  context?: RouteContext
) => Promise<Response> | Response;

async function readRequestBody(request: Request) {
  const { searchParams, pathname } = new URL(request.url);

  if (request.method === "GET" || request.method === "HEAD") {
    const query = Object.fromEntries(searchParams.entries());
    return Object.keys(query).length > 0 ? query : undefined;
  }

  try {
    return await request.clone().json();
  } catch {
    return undefined;
  }
}

async function readResponseBody(response: Response) {
  try {
    return await response.clone().json();
  } catch {
    try {
      return await response.clone().text();
    } catch {
      return undefined;
    }
  }
}

// Оборачивает обработчик API-роута и логирует запрос и ответ
export function withRouteLog(step: string, handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    const url = new URL(request.url);
    const requestBody = await readRequestBody(request);

    logApiRequest(step, {
      method: request.method,
      url: `${url.pathname}${url.search}`,
      body: requestBody,
    });

    const response = await handler(request, context);
    const responseBody = await readResponseBody(response);

    logApiResponse(step, {
      status: response.status,
      body: responseBody,
    });

    return response;
  };
}
