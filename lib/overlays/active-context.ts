import { calculateEclipseAspects, CALCULATION_VERSION } from "./aspects";
import type { OverlayRecord } from "@/lib/db/models/Overlay";

type Scope = Pick<OverlayRecord, "calculationVersion" | "aiCalculationVersion">;
export function hasCurrentAiContext(record: Scope): boolean {
  return (record.aiCalculationVersion ?? record.calculationVersion) === CALCULATION_VERSION;
}
// Пересчёт из сохранённых положений: старые записи могли содержать лишь соединения.
export function currentOverlayContext(record: OverlayRecord): OverlayRecord {
  const aspects = calculateEclipseAspects(record.natal.positions, record.eclipse.positions, record.eclipse.type);
  if (hasCurrentAiContext(record)) return { ...record, aspects };
  return { ...record, aspects, interpretation: "", messages: [], interpretationError: undefined,
    interpretationStatus: aspects.length ? "idle" : "empty" };
}
