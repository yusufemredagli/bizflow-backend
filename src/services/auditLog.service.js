import prisma from "../config/prisma.js"

const getActorMemberId = async (
  userId,
  companyId,
  db = prisma
) => {
  const member =
    await db.companyMember.findFirst({
      where: {
        userId,
        companyId
      },
      select: {
        id: true
      }
    })

  return member?.id || null
}

const createAuditLogService = async ({
  companyId,
  userId,
  action,
  entityType,
  entityId = null,
  message,
  metadata = null
}, db = prisma) => {
  const actorMemberId =
    await getActorMemberId(
      userId,
      companyId,
      db
    )

  return db.auditLog.create({
    data: {
      companyId,
      actorMemberId,
      action,
      entityType,
      entityId,
      message: message.slice(0, 191),
      metadata
    }
  })
}

const getAuditLogsService = async (
  companyId,
  limit = 10
) => {
  return prisma.auditLog.findMany({
    where: {
      companyId
    },

    take: Math.min(
      Number(limit) || 10,
      50
    ),

    orderBy: {
      createdAt: "desc"
    },

    include: {
      actor: {
        select: {
          id: true,
          role: true,

          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  })
}

export {
  createAuditLogService,
  getAuditLogsService
}