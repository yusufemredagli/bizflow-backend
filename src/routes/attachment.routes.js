import express from "express"
import { authMiddleware } from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/role.middleware.js"
import { validateId } from "../middlewares/query.middleware.js"
import { getAttachmentContent } from "../controllers/attachment.controller.js"

const router = express.Router()
router.use(authMiddleware, authorizeRoles("OWNER", "MANAGER", "TECHNICIAN"))
router.param("attachmentId", validateId)
router.get("/:attachmentId/content", getAttachmentContent)
export default router
