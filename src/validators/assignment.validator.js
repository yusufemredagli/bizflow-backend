import { z } from "zod"

const assignRequestSchema = z.object({
  memberId: z.number().int().positive()
})

export { assignRequestSchema }