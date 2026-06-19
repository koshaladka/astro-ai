import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { birthInputSchema } from "@/lib/schemas/birth-payload.zod";

const birthInputMongooseSchema = new Schema(
  {
    date: String,
    time: String,
    placeName: String,
    latitude: Number,
    longitude: Number,
    timezoneNote: String,
  },
  { _id: false }
);

const clientSchema = new Schema(
  {
    userId: { type: String, default: null },
    displayName: String,
    birthInput: { type: birthInputMongooseSchema, required: true },
  },
  { timestamps: true }
);

export type ClientDoc = InferSchemaType<typeof clientSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Client: Model<ClientDoc> =
  mongoose.models.Client ?? mongoose.model("Client", clientSchema);

export function parseBirthInput(input: unknown) {
  return birthInputSchema.parse(input);
}
