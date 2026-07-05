import { logApiRequest, logApiResponse } from "@/lib/utils/api-logger";

const SENSITIVE_KEY = /password|token|secret|api[_-]?key|authorization|cookie/i;

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function resolveUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function headersToObject(headers?: HeadersInit) {
  if (!headers) return undefined;

  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : value;
    });
    return out;
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(
      headers.map(([key, value]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[REDACTED]" : value,
      ])
    );
  }

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : String(value);
  }
  return out;
}

function parseRequestBody(body?: BodyInit | null) {
  if (!body) return undefined;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return "[binary]";
}

async function parseResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Выполняет fetch и логирует запрос и ответ
export async function loggedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  step?: string,
  fetchFn: FetchFn = fetch
) {
  const url = resolveUrl(input);
  const label = step ?? url;
  const method = init?.method ?? "GET";

  logApiRequest(label, {
    method,
    url,
    body: parseRequestBody(init?.body),
    headers: headersToObject(init?.headers),
  });

  const response = await fetchFn(input, init);
  const body = await parseResponseBody(response.clone());

  logApiResponse(label, {
    status: response.status,
    body,
  });

  return response;
}
