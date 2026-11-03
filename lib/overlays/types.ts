import type { Aspect, Position } from "./aspects";
import type { EclipseType } from "./catalog";
export type EclipseSnapshot = {
  id: string; type: EclipseType; maximumAt: string; sourceUrl: string;
  sourceTime: string; timeNote: string; positions: Position[];
};
export type NatalSnapshot = {
  chartId: string; label: string; houses: unknown; positions: Position[];
};
export type OverlayMessage = { role: "user" | "assistant"; content: string; aspectId?: string; createdAt: string };
export type OverlayView = {
  id: string; natal: NatalSnapshot; eclipse: EclipseSnapshot; aspects: Aspect[];
  interpretation: string; interpretationStatus: "idle" | "running" | "complete" | "error" | "empty";
  interpretationError?: string; messages: OverlayMessage[]; busy: boolean; createdAt: string;
};
