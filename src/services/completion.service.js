import prisma from "../config/prisma.js"

const completeServiceRequestService =
  async ({
    requestId,
    companyId,
    memberId,
    completionNote,
    materialsUsed,
    customerNote,
    serviceFee
  }, db = prisma) => {
    const serviceRequest =
      await db.serviceRequest.findFirst({
        where: {
          id:
            requestId,

          companyId
        },

        include: {
          assignments: true
        }
      })


    if (!serviceRequest) {
      const error =
        new Error(
          "Servis talebi bulunamadı"
        )

      error.statusCode = 404
      throw error
    }


    if (
      serviceRequest.status !==
      "IN_PROGRESS"
    ) {
      const error =
        new Error(
          "Sadece işlemde olan servisler tamamlanabilir"
        )

      error.statusCode = 409
      throw error
    }


    const completedAt =
      new Date()


    const result =
      await (db === prisma ? prisma.$transaction.bind(prisma) : async fn => fn(db))(
        async tx => {
          const updatedRequest =
            await tx.serviceRequest.update({
              where: {
                id:
                  serviceRequest.id,
                companyId,
                status: "IN_PROGRESS"
              },

              data: {
                status:
                  "COMPLETED",

                completionNote,

                materialsUsed:
                  materialsUsed ||
                  null,

                customerNote:
                  customerNote ||
                  null,

                serviceFee:
                  serviceFee ??
                  null,

                completedAt
              },

              include: {
                customer: true,

                assignments: {
                  include: {
                    member: {
                      include: {
                        user: { select: { id: true, name: true, email: true, createdAt: true, updatedAt: true } }
                      }
                    }
                  }
                },

                statusHistory: {
                  include: {
                    changedBy: {
                      include: {
                        user: { select: { id: true, name: true, email: true, createdAt: true, updatedAt: true } }
                      }
                    }
                  },

                  orderBy: {
                    createdAt:
                      "desc"
                  }
                },

                attachments: true
              }
            })


          const history =
            await tx.requestStatusHistory.create({
              data: {
                requestId:
                  serviceRequest.id,

                changedByMemberId:
                  memberId,

                oldStatus:
                  serviceRequest.status,

                newStatus:
                  "COMPLETED"
              },

              include: {
                changedBy: {
                  include: {
                    user: { select: { id: true, name: true, email: true, createdAt: true, updatedAt: true } }
                  }
                }
              }
            })


          return {
            serviceRequest:
              updatedRequest,

            history
          }
        }
      )


    return result
  }


export {
  completeServiceRequestService
}