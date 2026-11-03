import { activeAspects, CALCULATION_VERSION } from "./aspects";
import type { OverlayRecord } from "@/lib/db/models/Overlay";

type Scope = Pick<OverlayRecord, "calculationVersion" | "aiCalculationVersion">;
export function hasCurrentAiContext(record: Scope): boolean {
  return (record.aiCalculationVersion ?? record.calculationVersion) === CALCULATION_VERSION;
}
// Старые аспекты остаются в БД, но UI/ИИ используют только активный набор.
export function currentOverlayContext(record: OverlayRecord): OverlayRecord {
  const aspects = activeAspects(record.aspects);
  if (hasCurrentAiContext(record)) return { ...record, aspects };
  return { ...record, aspects, interpretation: "", messages: [], interpretationError: undefined,
    interpretationStatus: aspects.length ? "idle" : "empty" };
}
