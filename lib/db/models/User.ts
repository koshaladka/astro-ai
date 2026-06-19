import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const birthPreferencesSchema = new Schema(
  {
    date: String,
    time: String,
    placeName: String,
    latitude: Number,
    longitude: Number,
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, trim: true },
    birthPreferences: birthPreferencesSchema,
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User: Model<UserDoc> =
  mongoose.models.User ?? mongoose.model("User", userSchema);
