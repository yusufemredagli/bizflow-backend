import { z } from "zod"

const createMemberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(72),
  role: z.enum(["MANAGER", "TECHNICIAN"])
})

export { createMemberSchema }