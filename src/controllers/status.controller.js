import prisma from "../config/prisma.js"

import {
  updateRequestStatusService
} from "../services/status.service.js"

import {
  createAuditLogService
} from "../services/auditLog.service.js"


const updateRequestStatus = async (
  req,
  res,
  next
) => {
  try {
    const result = await prisma.$transaction(async tx => {
      const requestId =
        Number(req.params.id)

      const { status } =
        req.body

      const membership =
        await tx.companyMember.findFirst({
          where: {
            userId:
              req.user.userId,

            companyId:
              req.user.companyId
          },

          select: {
            id: true
          }
        })


      if (!membership) {
        const error =
          new Error(
            "Şirket üyeliği bulunamadı"
          )

        error.statusCode = 403

        throw error
      }


      const result =
        await updateRequestStatusService(
          requestId,
          status,
          req.user.companyId,
          membership.id,
          req.user.role,
          tx
        )


      await createAuditLogService({
        companyId:
          req.user.companyId,

        userId:
          req.user.userId,

        action:
          "STATUS_CHANGE",

        entityType:
          "SERVICE_REQUEST",

        entityId:
          requestId,

        message:
          `Servis durumu ${result.history.oldStatus} → ${result.history.newStatus} olarak değiştirildi`,

        metadata: {
          oldStatus:
            result.history.oldStatus,

          newStatus:
            result.history.newStatus
        }
      }, tx)



        return result
    })

    return res.status(200).json({
      success: true,
      message:
        "Servis durumu güncellendi",
      data: result
    })

  } catch (error) {
    next(error)
  }
}


export {
  updateRequestStatus
}
