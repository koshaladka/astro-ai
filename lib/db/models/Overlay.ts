import mongoose, { Schema, type Model } from "mongoose";
import { aspectSchema, overlayMessageSchema } from "./overlay-schemas";
import type { Aspect } from "@/lib/overlays/aspects";
import type { EclipseSnapshot, NatalSnapshot, OverlayMessage, OverlayView } from "@/lib/overlays/types";
export interface OverlayRecord {
  userId: string; natalChartId: string; eclipseId: string; calculationVersion: string;
  natal: NatalSnapshot; eclipse: EclipseSnapshot; aspects: Aspect[];
  interpretation: string; interpretationStatus: OverlayView["interpretationStatus"];
  interpretationError?: string; messages: OverlayMessage[];
  lockToken?: string; lockUntil?: Date; createdAt: Date; updatedAt: Date;
}
const schema = new Schema<OverlayRecord>({
  userId: { type: String, required: true, index: true }, natalChartId: { type: String, required: true },
  eclipseId: { type: String, required: true }, calculationVersion: { type: String, required: true },
  natal: { type: Schema.Types.Mixed, required: true }, eclipse: { type: Schema.Types.Mixed, required: true },
  aspects: { type: [aspectSchema], required: true }, interpretation: { type: String, default: "" },
  interpretationStatus: { type: String, enum: ["idle", "running", "complete", "error", "empty"], default: "idle" },
  interpretationError: String, messages: { type: [overlayMessageSchema], default: [] },
  lockToken: String, lockUntil: Date,
}, { timestamps: true });
schema.index({ userId: 1, natalChartId: 1, eclipseId: 1, calculationVersion: 1 }, { unique: true });
export const Overlay: Model<OverlayRecord> = mongoose.models.Overlay ?? mongoose.model<OverlayRecord>("Overlay", schema);
