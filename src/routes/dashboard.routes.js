import { validateQuery, validateId } from "../middlewares/query.middleware.js"
import express from "express"
import { authMiddleware } from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/role.middleware.js"
import { getDashboardSummary , getDashboardActivity} from "../controllers/dashboard.controller.js"

const router = express.Router()
router.param("id", validateId)
router.param("attachmentId", validateId)
router.use(validateQuery)

router.get(
  "/summary",
  authMiddleware,
  authorizeRoles("OWNER", "MANAGER"),
  getDashboardSummary
)

router.get(
  "/activity",
  authMiddleware,
  authorizeRoles(
    "OWNER",
    "MANAGER"
  ),
  getDashboardActivity
)

export default router