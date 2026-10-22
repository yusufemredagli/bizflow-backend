import { z } from "zod"

const createServiceRequestSchema = z.object({
  customerId: z
    .number()
    .int()
    .positive(),

  title: z
    .string()
    .trim()
    .min(3)
    .max(150),

  description: z
    .string()
    .trim()
    .min(5)
    .max(1000),

  priority: z.enum([
    "LOW",
    "NORMAL",
    "HIGH",
    "URGENT"
  ]),

  scheduledAt: z
    .string()
    .datetime()
    .optional(),

  slaHours: z
    .coerce
    .number()
    .int()
    .min(1)
    .max(168)
    .optional()
}).refine(data => data.slaHours === undefined || Boolean(data.scheduledAt), { message: "SLA için randevu tarihi gereklidir", path: ["slaHours"] })

export {
  createServiceRequestSchema
}