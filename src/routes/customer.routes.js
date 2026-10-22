import { validateQuery, validateId } from "../middlewares/query.middleware.js"
import express from "express"

import {
  validate
} from "../middlewares/validate.middleware.js"

import {
  authMiddleware
} from "../middlewares/auth.middleware.js"

import {
  authorizeRoles
} from "../middlewares/role.middleware.js"

import {
  createCustomerSchema
} from "../validators/customer.validator.js"

import {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer
} from "../controllers/customer.controller.js"


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
    createCustomerSchema
  ),
  createCustomer
)


router.get(
  "/",
  authMiddleware,
  authorizeRoles(
    "OWNER",
    "MANAGER"
  ),
  getCustomers
)


router.get(
  "/:id",
  authMiddleware,
  authorizeRoles(
    "OWNER",
    "MANAGER"
  ),
  getCustomer
)


router.patch(
  "/:id",
  authMiddleware,
  authorizeRoles(
    "OWNER",
    "MANAGER"
  ),
  validate(createCustomerSchema.partial()),
  updateCustomer
)


router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles(
    "OWNER",
    "MANAGER"
  ),
  deleteCustomer
)


export default router