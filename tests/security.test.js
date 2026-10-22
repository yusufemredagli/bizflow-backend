import test from "node:test"
import assert from "node:assert/strict"
import jwt from "jsonwebtoken"
import prisma from "../src/config/prisma.js"
import { authMiddleware } from "../src/middlewares/auth.middleware.js"
import { requestAccess } from "../src/middlewares/requestAccess.middleware.js"
import { validateQuery } from "../src/middlewares/query.middleware.js"
import { updateRequestStatusService } from "../src/services/status.service.js"
import { assignRequestService } from "../src/services/assignment.service.js"
import { completeServiceRequestService } from "../src/services/completion.service.js"
import { createCustomerSchema } from "../src/validators/customer.validator.js"
import { errorHandler } from "../src/middlewares/error.middleware.js"
import { createCustomer } from "../src/controllers/customer.controller.js"

const middleware = (fn, req) => new Promise(resolve => fn(req, {}, resolve))

test("customer updates strip tenant and nested relation injection", () => {
  assert.deepEqual(createCustomerSchema.partial().parse({ name: "Test", companyId: 99, company: { connect: { id: 99 } } }), { name: "Test" })
})
test("malformed bearer and missing expiry are rejected", async () => {
  assert.equal((await middleware(authMiddleware, { headers: { authorization: "Bearer abc extra" } })).statusCode, 401)
  process.env.JWT_SECRET = "test-only-key"
  const token = jwt.sign({ userId: 1, companyId: 2 }, process.env.JWT_SECRET)
  assert.equal((await middleware(authMiddleware, { headers: { authorization: `Bearer ${token}` } })).statusCode, 401)
})
test("current membership overrides stale JWT role", async () => {
  const original = prisma.companyMember.findFirst
  prisma.companyMember.findFirst = async () => ({ id: 3, role: "TECHNICIAN" })
  try {
    const req = { headers: { authorization: `Bearer ${jwt.sign({ userId: 1, companyId: 2, role: "OWNER" }, process.env.JWT_SECRET, { expiresIn: "1h" })}` } }
    assert.equal(await middleware(authMiddleware, req), undefined)
    assert.equal(req.user.role, "TECHNICIAN")
  } finally { prisma.companyMember.findFirst = original }
})
test("request access scopes both company and assigned technician", async () => {
  const original = prisma.serviceRequest.findFirst
  prisma.serviceRequest.findFirst = async ({ where }) => {
    assert.deepEqual(where, { id: 5, companyId: 2, assignments: { some: { memberId: 3 } } })
    return null
  }
  try {
    const error = await middleware(requestAccess, { params: { id: "5" }, user: { companyId: 2, role: "TECHNICIAN" }, member: { id: 3 } })
    assert.equal(error.statusCode, 404)
  } finally { prisma.serviceRequest.findFirst = original }
})
test("invalid list queries fail before Prisma", async () => {
  for (const query of [{ page: "1.5" }, { search: ["a", "b"] }, { status: "INVALID" }, { limit: "Infinity" }]) {
    assert.equal((await middleware(validateQuery, { query })).statusCode, 400)
  }
})
test("normal status endpoint cannot bypass completion", async () => {
  const db = { serviceRequest: { findFirst: async () => ({ status: "IN_PROGRESS" }) } }
  await assert.rejects(updateRequestStatusService(1, "COMPLETED", 2, 3, "OWNER", db), { statusCode: 409 })
})
test("assignment cannot reopen terminal requests", async () => {
  for (const status of ["COMPLETED", "CANCELLED", "IN_PROGRESS"]) {
    const db = { serviceRequest: { findFirst: async () => ({ status }) } }
    await assert.rejects(assignRequestService(1, 3, 2, 4, db), { statusCode: 409 })
  }
})
test("first assignment writes history within same transaction client", async () => {
  let history
  const db = {
    serviceRequest: { findFirst: async () => ({ status: "OPEN" }), update: async ({ where }) => { assert.equal(where.status, "OPEN"); return { status: "ASSIGNED" } } },
    companyMember: { findFirst: async () => ({ id: 3 }) },
    requestAssignment: { findFirst: async () => null, create: async () => ({ id: 8 }) },
    requestStatusHistory: { create: async ({ data }) => { history = data } }
  }
  await assignRequestService(1, 3, 2, 4, db)
  assert.deepEqual(history, { requestId: 1, changedByMemberId: 4, oldStatus: "OPEN", newStatus: "ASSIGNED" })
})
test("completion uses conditional update and excludes password hashes", async () => {
  const db = {
    serviceRequest: { findFirst: async () => ({ id: 1, status: "IN_PROGRESS" }), update: async ({ where, include, data }) => {
      assert.deepEqual(where, { id: 1, companyId: 2, status: "IN_PROGRESS" })
      assert.equal(include.assignments.include.member.include.user.select.passwordHash, undefined)
      assert.ok(data.completedAt instanceof Date)
      return { id: 1 }
    } },
    requestStatusHistory: { create: async () => ({ id: 1 }) }
  }
  await completeServiceRequestService({ requestId: 1, companyId: 2, memberId: 3, completionNote: "Completed" }, db)
})
test("audit failure rejects transaction before successful response", async () => {
  const original = prisma.$transaction
  let responseSent = false
  const failure = new Error("audit failed")
  prisma.$transaction = async fn => fn({ customer: { create: async () => ({ id: 1, name: "Test" }) }, companyMember: { findFirst: async () => ({ id: 3 }) }, auditLog: { create: async () => { throw failure } } })
  try {
    const error = await new Promise(resolve => createCustomer({ body: {}, user: { companyId: 2, userId: 1 } }, { status: () => { responseSent = true } }, resolve))
    assert.equal(error, failure)
    assert.equal(responseSent, false)
  } finally { prisma.$transaction = original }
})
test("unexpected database errors do not expose internals", () => {
  let status, body
  errorHandler(new Error("password=private SQL"), {}, { status: value => { status = value; return { json: value => { body = value } } } }, () => {})
  assert.equal(status, 500)
  assert.equal(body.message, "Sunucu hatası")
})
