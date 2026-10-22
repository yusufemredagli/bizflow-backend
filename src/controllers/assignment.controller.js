import prisma from "../config/prisma.js"
import {
  assignRequestService
} from "../services/assignment.service.js"

import {
  createAuditLogService
} from "../services/auditLog.service.js"

const assignRequest = async (
  req,
  res,
  next
) => {
  try {
    const result = await prisma.$transaction(async tx => {
      const requestId =
        Number(req.params.id)

      const { memberId } =
        req.body

      const result =
        await assignRequestService(
          requestId,
          memberId,
          req.user.companyId,
          req.member.id,
          tx
        )

      await createAuditLogService({
        companyId:
          req.user.companyId,

        userId:
          req.user.userId,

        action:
          "ASSIGN",

        entityType:
          "SERVICE_REQUEST",

        entityId:
          requestId,

        message:
          "Servis talebine teknisyen atandı",

        metadata: {
          memberId:
            Number(memberId)
        }
      }, tx)


        return result
    })

    return res.status(201).json({
      success: true,
      message:
        "Teknisyen servis talebine atandı",
      data: result
    })

  } catch (error) {
    next(error)
  }
}

export {
  assignRequest
}
