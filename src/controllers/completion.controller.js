import prisma from "../config/prisma.js"

import {
  completeServiceRequestSchema
} from "../validators/serviceCompletion.validation.js"

import {
  completeServiceRequestService
} from "../services/completion.service.js"

import {
  createAuditLogService
} from "../services/auditLog.service.js"


const completeServiceRequest =
  async (
    req,
    res,
    next
  ) => {
    try {
    const result = await prisma.$transaction(async tx => {
        const requestId =
          Number(
            req.params.id
          )


        const parsed =
          completeServiceRequestSchema.safeParse(
            req.body
          )


        if (!parsed.success) {
          const error =
            new Error(
              parsed.error.issues?.[0]
                ?.message ||
              "Geçersiz servis tamamlama bilgileri"
            )

          error.statusCode = 400
          throw error
        }


        const membership =
          await tx.companyMember.findFirst({
            where: {
              userId:
                req.user.userId,

              companyId:
                req.user.companyId
            },

            select: {
              id: true,
              role: true
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
          await completeServiceRequestService({
            requestId,

            companyId:
              req.user.companyId,

            memberId:
              membership.id,

            ...parsed.data
          }, tx)


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
            `Servis talebi tamamlandı`,

          metadata: {
            oldStatus:
              "IN_PROGRESS",

            newStatus:
              "COMPLETED",

            serviceFee:
              parsed.data.serviceFee ??
              null
          }
        }, tx)


  
        return result
    })

    return res
        .status(200)
        .json({
          success: true,

          message:
            "Servis başarıyla tamamlandı",

          data:
            result
        })

    } catch (error) {
      next(error)
    }
  }


export {
  completeServiceRequest
}
