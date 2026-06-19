import { z } from "zod";

export const birthConfigSchema = z.object({
  observation_point: z.enum(["geocentric", "topocentric"]),
  ayanamsha: z.string(),
  house_system: z.string(),
  language: z.string(),
});

export const apiPayloadSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  date: z.number().int().min(1).max(31),
  hours: z.number().int().min(0).max(23),
  minutes: z.number().int().min(0).max(59),
  seconds: z.number().int().min(0).max(59),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.number().min(-12).max(14),
  config: birthConfigSchema,
});

export const birthInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  placeName: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  timezoneNote: z.string().optional(),
});

export type ApiPayload = z.infer<typeof apiPayloadSchema>;
export type BirthInput = z.infer<typeof birthInputSchema>;

// Проверяет JSON для Free Astrology API
export function validateApiPayload(json: unknown): ApiPayload {
  return apiPayloadSchema.parse(json);
}
