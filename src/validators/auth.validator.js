import {z} from "zod"

const registerSchema = z.object({

    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(8).max(72),
    companyName: z.string().trim().min(2).max(150),

})

const loginSchema = z.object({
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(8).max(72)

})

export { registerSchema , loginSchema}