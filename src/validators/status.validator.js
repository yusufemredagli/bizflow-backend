import { z } from "zod"

const updateRequestStatusSchema = z.object({
  status: z.enum([
    "ASSIGNED",
    "ON_THE_WAY",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED"
  ])
})

export { updateRequestStatusSchema }