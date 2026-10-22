import { validateQuery, validateId } from "../middlewares/query.middleware.js"
import express from "express"

import {
  authMiddleware
} from "../middlewares/auth.middleware.js"

import {
  authorizeRoles
} from "../middlewares/role.middleware.js"

import {
  validate
} from "../middlewares/validate.middleware.js"

import {
  createMemberSchema
} from "../validators/member.validator.js"

import {
  createMember,
  getMembers,
  getMember
} from "../controllers/member.controller.js"


const router =
  express.Router()
router.param("id", validateId)
router.param("attachmentId", validateId)
router.use(validateQuery)


router.post(
  "/",
  authMiddleware,
  authorizeRoles(
    "OWNER",
    "MANAGER"
  ),
  validate(
    createMemberSchema
  ),
  createMember
)


router.get(
  "/",
  authMiddleware,
  authorizeRoles(
    "OWNER",
    "MANAGER"
  ),
  getMembers
)


router.get(
  "/:id",
  authMiddleware,
  authorizeRoles(
    "OWNER",
    "MANAGER"
  ),
  getMember
)


export default router