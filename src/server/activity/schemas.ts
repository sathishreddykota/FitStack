import { z } from "zod";
import { dateStringSchema } from "../dates";

export const activityTypeSchema = z.enum(["RUN", "WALK", "HIKE", "RIDE", "TREADMILL"]);

const meta = {
  /** Set by the recording device, so a retried upload never creates a duplicate. */
  clientId: z.string().min(8).max(64),
  title: z.string().trim().min(1).max(80).optional(),
  notes: z.string().trim().max(1000).optional(),
  feel: z.number().int().min(1).max(5).optional(),
  isPrivate: z.boolean().default(true),
};

const pointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  t: z.number().int().positive(),
  alt: z.number().min(-500).max(9000).nullable().optional(),
  acc: z.number().min(0).max(10_000).nullable().optional(),
  seg: z.number().int().min(0).max(1000).nullable().optional(),
});

export const saveActivitySchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("GPS"),
    type: activityTypeSchema.exclude(["TREADMILL"]),
    // ~6 h at one fix per second
    points: z.array(pointSchema).min(2).max(25_000),
    ...meta,
  }),
  z.object({
    source: z.literal("MANUAL"),
    type: activityTypeSchema,
    date: dateStringSchema,
    /** local start time "HH:mm", optional */
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    distanceM: z.number().min(10).max(300_000),
    durationSec: z.number().int().min(30).max(6 * 3600 * 4),
    ...meta,
  }),
]);

export const updateActivitySchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  feel: z.number().int().min(1).max(5).nullable().optional(),
  isPrivate: z.boolean().optional(),
});

export const listActivitiesQuery = z.object({
  type: activityTypeSchema.optional(),
  cursor: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
