import {z} from "zod"

const createCustomerSchema = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().min(2).max(30).toLowerCase().optional(),
    phone: z.string().min(8).max(20),
    address: z.string().min(8).max(240),
})


export {createCustomerSchema}