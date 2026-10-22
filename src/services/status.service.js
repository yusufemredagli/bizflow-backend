import prisma from "../config/prisma.js"

const updateRequestStatusService = async (
  requestId,
  newStatus,
  companyId,
  memberId,
  role,
  db = prisma
) => {
  const serviceRequest = await db.serviceRequest.findFirst({
    where: {
      id: requestId,
      companyId
    }
  })

  if (!serviceRequest) {
    const error = new Error("Servis talebi bulunamadı")
    error.statusCode = 404
    throw error
  }

  if (role === "TECHNICIAN") {
    const assignment = await db.requestAssignment.findFirst({
      where: {
        requestId,
        memberId
      }
    })

    if (!assignment) {
      const error = new Error("Bu servis talebi size atanmadı")
      error.statusCode = 403
      throw error
    }
  }

  const allowedTransitions = {
    OPEN: ["CANCELLED"],
    ASSIGNED: ["ON_THE_WAY", "CANCELLED"],
    ON_THE_WAY: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["CANCELLED"],
    COMPLETED: [],
    CANCELLED: []
    }
  const allowedStatuses = allowedTransitions[serviceRequest.status]

  if (!allowedStatuses.includes(newStatus)) {
    const error = new Error(
      `${serviceRequest.status} durumundan ${newStatus} durumuna geçilemez`
    )
    error.statusCode = 409
    throw error
  }

  const result = await (db === prisma ? prisma.$transaction.bind(prisma) : async fn => fn(db))(async (tx) => {
    const updatedRequest = await tx.serviceRequest.update({
      where: {
        id: requestId,
        companyId,
        status: serviceRequest.status
      },
      data: {
        status: newStatus
      }
    })

    const history = await tx.requestStatusHistory.create({
      data: {
        requestId,
        changedByMemberId: memberId,
        oldStatus: serviceRequest.status,
        newStatus
      }
    })

    return {
      serviceRequest: updatedRequest,
      history
    }
  })

  return result
}

export { updateRequestStatusService }