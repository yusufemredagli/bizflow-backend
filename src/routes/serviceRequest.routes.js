import { validateQuery, validateId } from "../middlewares/query.middleware.js"
import { requestAccess } from "../middlewares/requestAccess.middleware.js"
import express from "express"
import { validate } from "../middlewares/validate.middleware.js"
import { authMiddleware } from "../middlewares/auth.middleware.js"
import { authorizeRoles } from "../middlewares/role.middleware.js"
import { createServiceRequestSchema } from "../validators/serviceRequest.validator.js"

import { assignRequestSchema } from "../validators/assignment.validator.js"
import { assignRequest } from "../controllers/assignment.controller.js"

import { updateRequestStatusSchema } from "../validators/status.validator.js"
import { updateRequestStatus } from "../controllers/status.controller.js"

import {
  createServiceRequest,
  getServiceRequests,
  getServiceRequest,
  getMyAssignedRequests
} from "../controllers/serviceRequest.controller.js"

import {
  uploadAttachment,
  getAttachments,
  deleteAttachment
} from "../controllers/attachment.controller.js"

import {
  upload
} from "../middlewares/upload.middleware.js"

import {
  completeServiceRequest
} from "../controllers/completion.controller.js"


const router = express.Router()
router.param("id", validateId)
router.param("attachmentId", validateId)
router.use(validateQuery)

router.get(
  "/:id/attachments",
  authMiddleware,
  requestAccess,
  getAttachments
)

router.post(
  "/:id/attachments",
  authMiddleware,
  requestAccess,
  upload.single("file"),
  uploadAttachment
)

router.delete(
  "/:id/attachments/:attachmentId",
  authMiddleware,
  requestAccess,
  deleteAttachment
)

router.patch(
  "/:id/complete",
  authMiddleware,
  requestAccess,
  completeServiceRequest
)

router.post(
  "/",
  authMiddleware,
  authorizeRoles("OWNER", "MANAGER"),
  validate(createServiceRequestSchema),
  createServiceRequest
)

router.get(
  "/",
  authMiddleware,
  authorizeRoles("OWNER", "MANAGER", "TECHNICIAN"),
  getServiceRequests
)

router.get(
  "/my",
  authMiddleware,
  authorizeRoles("TECHNICIAN"),
  getMyAssignedRequests
)

router.get(
  "/:id",
  authMiddleware,
  requestAccess,
  authorizeRoles("OWNER", "MANAGER", "TECHNICIAN"),
  getServiceRequest
)


router.post(
  "/:id/assign",
  authMiddleware,
  requestAccess,
  authorizeRoles("OWNER", "MANAGER"),
  validate(assignRequestSchema),
  assignRequest
)

router.patch(
  "/:id/status",
  authMiddleware,
  requestAccess,
  authorizeRoles("OWNER", "MANAGER", "TECHNICIAN"),
  validate(updateRequestStatusSchema),
  updateRequestStatus
)

export default router