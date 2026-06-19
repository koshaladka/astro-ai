import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const agentTraceSchema = new Schema(
  {
    provider: String,
    model: String,
    promptVersion: String,
  },
  { _id: false }
);

const chartRequestSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    status: {
      type: String,
      enum: ["draft", "validated", "error"],
      default: "draft",
    },
    apiPayload: { type: Schema.Types.Mixed },
    agentTrace: agentTraceSchema,
    validationErrors: [String],
  },
  { timestamps: true }
);

export type ChartRequestDoc = InferSchemaType<typeof chartRequestSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ChartRequest: Model<ChartRequestDoc> =
  mongoose.models.ChartRequest ??
  mongoose.model("ChartRequest", chartRequestSchema);
