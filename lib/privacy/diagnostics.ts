const OPERATIONS = new Set([
  "interpreter", "chart-qa", "overlay-interpretation", "overlay-qa", "external.fetch",
  "astrology.planets", "astrology.houses", "gigachat.chat",
  "auth.register.POST", "auth.login.POST", "auth.logout.POST", "auth.me.GET",
  "charts.GET", "charts.POST", "charts.id.GET", "charts.id.DELETE",
  "charts.ask.POST", "charts.reinterpret.POST", "charts.status.GET",
  "profile.GET", "profile.PATCH", "places.search.GET", "health.GET",
]);
export function diagnosticOperation(value: string) {
  return OPERATIONS.has(value) ? value : "request";
}
export function diagnosticMethod(value?: string) {
  const method = value?.toUpperCase();
  return method && ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(method) ? method : "REQUEST";
}
export function diagnosticDuration(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : undefined;
}
export function diagnosticRequestId(value?: string) {
  return value && /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(value) ? value : undefined;
}
export function diagnosticStatus(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 599 ? value : 0;
}
