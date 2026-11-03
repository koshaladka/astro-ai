import { Schema } from "mongoose";
import { ASPECTS, BODY_NAMES, type Aspect, type Position } from "@/lib/overlays/aspects";
import type { OverlayMessage } from "@/lib/overlays/types";

export const positionSchema = new Schema<Position>({
  id: { type: String, enum: Object.keys(BODY_NAMES), required: true },
  name: { type: String, required: true },
  longitude: { type: Number, required: true, min: 0, max: 360 },
  retrograde: { type: Boolean, required: true },
}, { _id: false });
export const aspectSchema = new Schema<Aspect>({
  id: { type: String, required: true },
  natal: { type: positionSchema, required: true },
  eclipse: { type: positionSchema, required: true },
  type: { type: String, enum: ASPECTS.map(a => a.id), required: true },
  name: { type: String, required: true },
  angle: { type: Number, required: true },
  distance: { type: Number, required: true },
  orb: { type: Number, required: true, min: 0, max: 5 },
}, { _id: false });
export const overlayMessageSchema = new Schema<OverlayMessage>({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  aspectId: String,
  createdAt: { type: String, required: true },
}, { _id: false });
