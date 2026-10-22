import prisma from "../config/prisma.js"

export const requestAccess = async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
      throw Object.assign(new Error("Geçersiz servis talebi ID"), { statusCode: 400 })
    }
    const request = await prisma.serviceRequest.findFirst({
      where: {
        id, companyId: req.user.companyId,
        ...(req.user.role === "TECHNICIAN" && { assignments: { some: { memberId: req.member.id } } })
      },
      select: { id: true }
    })
    if (!request) throw Object.assign(new Error("Servis talebi bulunamadı"), { statusCode: 404 })
    next()
  } catch (error) { next(error) }
}
