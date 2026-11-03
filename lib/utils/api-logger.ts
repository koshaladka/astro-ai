import { diagnosticDuration, diagnosticMethod, diagnosticOperation, diagnosticRequestId, diagnosticStatus } from "@/lib/privacy/diagnostics";

// Даже при явном включении логов содержимое запросов/ответов не записывается.
export function isApiLogEnabled() {
  return process.env.API_LOG === "true";
}
// Совместимость для старых импортов; не читаем произвольные объекты с личными данными.
export function redactData(_data: unknown): string {
  return "[OMITTED]";
}
export function logApiRequest(step: string, details: {
  method?: string; url: string; body?: unknown; headers?: Record<string, string>; requestId?: string;
}) {
  if (!isApiLogEnabled()) return;
  console.log(JSON.stringify({ event: "api.request", operation: diagnosticOperation(step),
    method: diagnosticMethod(details.method), requestId: diagnosticRequestId(details.requestId) }));
}
export function logApiResponse(step: string, details: {
  status: number; body?: unknown; requestId?: string; durationMs?: number;
}) {
  if (!isApiLogEnabled()) return;
  console.log(JSON.stringify({ event: "api.response", operation: diagnosticOperation(step),
    status: diagnosticStatus(details.status), requestId: diagnosticRequestId(details.requestId),
    durationMs: diagnosticDuration(details.durationMs) }));
}
