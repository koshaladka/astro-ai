const SENSITIVE_KEY = /password|token|secret|api[_-]?key|authorization|cookie/i;
const MAX_LEN = 4000;

// Проверяет, включено ли логирование API (в dev по умолчанию да)
export function isApiLogEnabled() {
  if (process.env.API_LOG === "false") return false;
  if (process.env.API_LOG === "true") return true;
  return process.env.NODE_ENV === "development";
}

function truncate(value: string) {
  if (value.length <= MAX_LEN) return value;
  return `${value.slice(0, MAX_LEN)}…[+${value.length - MAX_LEN}]`;
}

// Скрывает пароли и ключи в данных для логов
export function redactData(data: unknown): unknown {
  if (data == null) return data;
  if (typeof data === "string") return truncate(data);
  if (Array.isArray(data)) return data.map(redactData);
  if (typeof data === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEY.test(key) && typeof value === "string") {
        out[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        out[key] = redactData(value);
      } else {
        out[key] = value;
      }
    }
    return out;
  }
  return data;
}

function formatData(data: unknown) {
  if (data == null) return "—";
  try {
    return truncate(JSON.stringify(redactData(data), null, 2));
  } catch {
    return truncate(String(data));
  }
}

// Пишет в консоль исходящий или входящий запрос
export function logApiRequest(
  step: string,
  details: {
    method?: string;
    url: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
) {
  if (!isApiLogEnabled()) return;

  const lines = [
    `[API] → REQUEST ${step}`,
    `  ${details.method ?? "GET"} ${details.url}`,
  ];

  if (details.headers && Object.keys(details.headers).length > 0) {
    lines.push(`  headers: ${formatData(details.headers)}`);
  }
  if (details.body !== undefined) {
    lines.push(`  body: ${formatData(details.body)}`);
  }

  console.log(lines.join("\n"));
}

// Пишет в консоль ответ API
export function logApiResponse(
  step: string,
  details: {
    status: number;
    body?: unknown;
  }
) {
  if (!isApiLogEnabled()) return;

  console.log(
    `[API] ← RESPONSE ${step}\n  status: ${details.status}\n  body: ${formatData(details.body)}`
  );
}
