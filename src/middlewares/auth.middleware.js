import jwt from "jsonwebtoken"
import prisma from "../config/prisma.js"

const authMiddleware = async (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || "")
  if (!match) return next(Object.assign(new Error("Geçersiz token formatı"), { statusCode: 401 }))
  let decoded
  try {
    decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ["HS256"] })
    if (!Number.isSafeInteger(decoded.userId) || decoded.userId <= 0 ||
        !Number.isSafeInteger(decoded.companyId) || decoded.companyId <= 0 ||
        !Number.isFinite(decoded.exp)) throw new Error("Invalid claims")
  } catch {
    return next(Object.assign(new Error("Geçersiz veya süresi dolmuş token"), { statusCode: 401 }))
  }
  try {
    const member = await prisma.companyMember.findFirst({
      where: { userId: decoded.userId, companyId: decoded.companyId },
      select: { id: true, role: true }
    })
    if (!member) return next(Object.assign(new Error("Şirket üyeliği bulunamadı"), { statusCode: 403 }))
    req.user = { ...decoded, role: member.role }
    req.member = member
    next()
  } catch (error) { next(error) }
}
export { authMiddleware }
