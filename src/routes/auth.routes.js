import express from "express"
import { loginSchema, registerSchema } from "../validators/auth.validator.js"
import { validate } from "../middlewares/validate.middleware.js"
import { register } from "../controllers/auth.controllers.js"
import { login } from "../controllers/auth.controllers.js"
import { authMiddleware } from "../middlewares/auth.middleware.js"


const router = express.Router()

router.post("/register" , validate(registerSchema) , register)

router.post("/login", validate(loginSchema) , login)

router.get("/me", authMiddleware, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  })
})

export default router;