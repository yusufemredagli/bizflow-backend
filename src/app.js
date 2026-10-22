import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"

import authRoutes from "./routes/auth.routes.js"
import customerRoutes from "./routes/customer.routes.js"
import serviceRequestRoutes from "./routes/serviceRequest.routes.js"
import memberRoutes from "./routes/member.routes.js"
import dashboardRoutes from "./routes/dashboard.routes.js"

import { errorHandler } from "./middlewares/error.middleware.js"

import swaggerUi from "swagger-ui-express"
import { swaggerSpec } from "./config/swagger.js"


import attachmentRoutes from "./routes/attachment.routes.js"
import { authMiddleware } from "./middlewares/auth.middleware.js"


const app = express()
app.disable("x-powered-by")
if (process.env.TRUST_PROXY_HOPS) {
  const hops = Number(process.env.TRUST_PROXY_HOPS)
  if (!Number.isInteger(hops) || hops < 1) throw new Error("Invalid TRUST_PROXY_HOPS")
  app.set("trust proxy", hops)
}
if (process.env.NODE_ENV === "production" && (!process.env.FRONTEND_URL || !process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32)) {
  throw new Error("Production requires FRONTEND_URL and a JWT_SECRET of at least 32 bytes")
}

app.use(
  cors({
    origin: process.env.FRONTEND_URL || false
  })
)

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    }
  })
)

app.use(express.json())

// Legacy file URLs never serve bytes, including for authenticated users.
app.use("/uploads", authMiddleware, (req, res) => {
  res.status(404).json({ success: false, message: "Dosya bulunamadı" })
})

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin."
  }
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin."
  }
})

app.use(apiLimiter)
app.use("/attachments", attachmentRoutes)

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
)

app.use(
  "/auth",
  authLimiter,
  authRoutes
)

app.use(
  "/customers",
  customerRoutes
)

app.use(
  "/service-requests",
  serviceRequestRoutes
)

app.use(
  "/members",
  memberRoutes
)

app.use(
  "/dashboard",
  dashboardRoutes
)

app.use((req, res) => res.status(404).json({ success: false, message: "Endpoint bulunamadı" }))
app.use(errorHandler)

export default app