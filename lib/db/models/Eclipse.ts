import mongoose, { Schema, type Model } from "mongoose";
import type { Position } from "@/lib/overlays/aspects";
import { ECLIPSE_TYPES, type EclipseType } from "@/lib/overlays/catalog";
export interface EclipseRecord {
  type: EclipseType; maximumAt: Date; sourceUrl: string; sourceTime: string;
  sourceScale: string; precisionSeconds: number; timeNote: string; createdBy?: string;
  positions?: Position[]; raw?: unknown; configuration: string;
  fetchStatus: "pending" | "running" | "ready" | "error"; error?: string;
  lockToken?: string; lockUntil?: Date; fetchedAt?: Date; createdAt: Date; updatedAt: Date;
}
const schema = new Schema<EclipseRecord>({
  type: { type: String, enum: Object.keys(ECLIPSE_TYPES), required: true, immutable: true },
  maximumAt: { type: Date, required: true, immutable: true },
  sourceUrl: { type: String, required: true, immutable: true },
  sourceTime: { type: String, required: true, immutable: true },
  sourceScale: { type: String, required: true, immutable: true },
  precisionSeconds: { type: Number, required: true }, timeNote: { type: String, required: true },
  createdBy: String, positions: { type: [Schema.Types.Mixed], default: undefined }, raw: Schema.Types.Mixed,
  configuration: { type: String, required: true },
  fetchStatus: { type: String, enum: ["pending", "running", "ready", "error"], default: "pending" },
  error: String, lockToken: String, lockUntil: Date, fetchedAt: Date,
}, { timestamps: true });
schema.index({ type: 1, maximumAt: 1 }, { unique: true });
export const Eclipse: Model<EclipseRecord> = mongoose.models.Eclipse ?? mongoose.model<EclipseRecord>("Eclipse", schema);
