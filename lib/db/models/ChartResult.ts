import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const interpretationSchema = new Schema(
  {
    short: String,
    highlights: [String],
  },
  { _id: false }
);

const chartMessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chartResultSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    requestId: { type: Schema.Types.ObjectId, ref: "ChartRequest", required: true },
    status: {
      type: String,
      enum: ["pending", "fetched", "interpreted", "error"],
      default: "pending",
    },
    planets: { type: Schema.Types.Mixed },
    houses: { type: Schema.Types.Mixed },
    raw: { type: Schema.Types.Mixed },
    interpretation: interpretationSchema,
    messages: [chartMessageSchema],
    fetchedAt: Date,
    interpretedAt: Date,
    errorMessage: String,
  },
  { timestamps: true }
);

export type ChartResultDoc = InferSchemaType<typeof chartResultSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ChartResult: Model<ChartResultDoc> =
  mongoose.models.ChartResult ??
  mongoose.model("ChartResult", chartResultSchema);
