// Тестовый SDK: фиксирует только payload telemetry, реальной сети нет.
export class Langfuse {
  trace(payload) {
    globalThis.__privacyTelemetry.push(['trace', payload]);
    return { generation(payload) {
      globalThis.__privacyTelemetry.push(['generation', payload]);
      return { end(payload) { globalThis.__privacyTelemetry.push(['end', payload]); } };
    } };
  }
  async shutdownAsync() {
    if (globalThis.__privacyTelemetryHangs) return new Promise(() => {});
    if (globalThis.__privacyTelemetryFailure) throw new Error('telemetry failed: PRIVATE_DATA');
  }
}
