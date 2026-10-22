import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import { once } from "node:events"
import jwt from "jsonwebtoken"
import prisma from "../src/config/prisma.js"
import app from "../src/app.js"

// Exercise the real HTTP router, auth, streaming, Multer and filesystem with an isolated DB double.
test("private attachment HTTP flows", async t => {
  process.env.JWT_SECRET = "attachment-test-key-only"
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==", "base64")
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF")
  const prefix = `test-${crypto.randomUUID()}`
  const files = [`${prefix}.png`, `${prefix}.pdf`, `${prefix}-link.png`]
  const records = new Map([
    [101, { id: 101, requestId: 5, fileName: files[0], mimeType: "image/png" }],
    [102, { id: 102, requestId: 5, fileName: files[1], mimeType: "application/pdf" }]
  ])
  const members = new Map([
    [1, { id: 11, role: "OWNER", companyId: 2 }],
    [2, { id: 12, role: "MANAGER", companyId: 2 }],
    [3, { id: 13, role: "TECHNICIAN", companyId: 2 }],
    [4, { id: 14, role: "TECHNICIAN", companyId: 2 }],
    [5, { id: 15, role: "OWNER", companyId: 9 }],
    [6, { id: 16, role: "MANAGER", companyId: 9 }]
  ])
  const originals = []
  const replace = (object, key, value) => { originals.push(() => { object[key] = value }); object[key] = value }
  const allowed = where => where.companyId === 2 && (!where.assignments || where.assignments.some.memberId === 13)
  replace(prisma.companyMember, "findFirst", async ({ where }) => {
    const member = members.get(where.userId)
    return member?.companyId === where.companyId ? member : null
  })
  replace(prisma.serviceRequest, "findFirst", async ({ where }) => where.id === 5 && allowed(where) ? { id: 5 } : null)
  replace(prisma.serviceRequestAttachment, "findFirst", async ({ where }) => {
    const row = records.get(where.id)
    if (!row || (where.requestId && row.requestId !== where.requestId) || !allowed(where.request)) return null
    return row
  })
  replace(prisma.serviceRequestAttachment, "findMany", async ({ where }) => [...records.values()].filter(row => row.requestId === where.requestId))
  replace(prisma.serviceRequestAttachment, "create", async ({ data }) => {
    files.push(data.fileName)
    const row = { ...data, id: 103 }
    records.set(row.id, row)
    return row
  })
  replace(prisma.serviceRequestAttachment, "delete", async ({ where }) => {
    const row = records.get(where.id)
    records.delete(where.id)
    return row
  })
  replace(prisma.auditLog, "create", async ({ data }) => data)
  replace(prisma, "$transaction", async callback => callback(prisma))
  let server
  try {
    await fs.mkdir("uploads", { recursive: true })
    await fs.writeFile(path.resolve("uploads", files[0]), png)
    await fs.writeFile(path.resolve("uploads", files[1]), pdf)
    server = app.listen(0, "127.0.0.1")
    await once(server, "listening")
    const base = `http://127.0.0.1:${server.address().port}`
    const auth = userId => {
      const member = members.get(userId)
      return { Authorization: `Bearer ${jwt.sign({ userId, companyId: member.companyId, role: member.role }, process.env.JWT_SECRET, { expiresIn: "1h" })}` }
    }
    const get = (id, userId) => fetch(`${base}/attachments/${id}/content`, { headers: userId ? auth(userId) : {} })
    await t.test("anonymous new and legacy URLs return 401", async () => {
      assert.equal((await get(101)).status, 401)
      assert.equal((await fetch(`${base}/uploads/${files[0]}`)).status, 401)
      assert.equal((await fetch(`${base}/uploads/${files[0]}`, { headers: auth(1) })).status, 404)
    })
    await t.test("other tenant owner and manager receive 404", async () => {
      for (const id of [5, 6]) assert.equal((await get(101, id)).status, 404)
    })
    await t.test("unassigned technician receives 404", async () => assert.equal((await get(101, 4)).status, 404))
    await t.test("owner, manager and assigned technician receive exact image bytes", async () => {
      for (const id of [1, 2, 3]) {
        const response = await get(101, id)
        assert.equal(response.status, 200)
        assert.equal(response.headers.get("content-type"), "image/png")
        assert.equal(response.headers.get("content-disposition"), "inline")
        assert.equal(response.headers.get("cache-control"), "private, no-store")
        assert.equal(response.headers.get("x-content-type-options"), "nosniff")
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), png)
      }
    })
    await t.test("PDF opens inline with PDF MIME", async () => {
      const response = await get(102, 3)
      assert.equal(response.status, 200)
      assert.equal(response.headers.get("content-type"), "application/pdf")
      assert.equal(response.headers.get("content-disposition"), "inline")
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf)
    })
    await t.test("missing DB record and missing physical file return 404", async () => {
      assert.equal((await get(999, 1)).status, 404)
      records.set(104, { id: 104, requestId: 5, fileName: `${prefix}-missing.png`, mimeType: "image/png" })
      assert.equal((await get(104, 1)).status, 404)
    })
    await t.test("DB path traversal and symlink escape cannot serve outside uploads", async () => {
      for (const fileName of ["../package.json", "..\\package.json", path.resolve("package.json")]) {
        records.set(105, { id: 105, requestId: 5, fileName, mimeType: "image/png" })
        assert.equal((await get(105, 1)).status, 404)
      }
      await fs.symlink(path.resolve("package.json"), path.resolve("uploads", files[2]))
      records.set(105, { id: 105, requestId: 5, fileName: files[2], mimeType: "image/png" })
      assert.equal((await get(105, 1)).status, 404)
    })
    await t.test("upload, list, view and delete retain existing contracts", async () => {
      const form = new FormData()
      form.append("file", new Blob([png], { type: "image/png" }), "preview.png")
      const uploaded = await fetch(`${base}/service-requests/5/attachments`, { method: "POST", headers: auth(1), body: form })
      assert.equal(uploaded.status, 201)
      const body = await uploaded.json()
      assert.equal(body.success, true)
      assert.equal(body.data.originalName, "preview.png")
      assert.ok(body.data.filePath.startsWith("/uploads/"))
      const list = await fetch(`${base}/service-requests/5/attachments`, { headers: auth(3) })
      assert.equal(list.status, 200)
      assert.ok((await list.json()).data.some(row => row.id === 103))
      assert.equal((await get(103, 3)).status, 200)
      const deleted = await fetch(`${base}/service-requests/5/attachments/103`, { method: "DELETE", headers: auth(1) })
      assert.equal(deleted.status, 200)
      assert.deepEqual(await deleted.json(), { success: true, message: "Dosya başarıyla silindi" })
      assert.equal((await get(103, 1)).status, 404)
      await assert.rejects(fs.stat(path.resolve("uploads", body.data.fileName)), { code: "ENOENT" })
    })
  } finally {
    if (server) await new Promise(resolve => server.close(resolve))
    originals.reverse().forEach(restore => restore())
    await Promise.all(files.map(file => fs.unlink(path.resolve("uploads", file)).catch(error => { if (error.code !== "ENOENT") throw error })))
  }
})
