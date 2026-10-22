import prisma from "../config/prisma.js"

const assignRequestService = async (requestId, memberId, companyId, actorMemberId, db = prisma) => {
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

  if (!["OPEN", "ASSIGNED"].includes(serviceRequest.status)) {
    const error = new Error("Bu durumdaki servis talebine atama yapılamaz")
    error.statusCode = 409
    throw error
  }

  const member = await db.companyMember.findFirst({
    where: {
      id: memberId,
      companyId,
      role: "TECHNICIAN"
    }
  })

  if (!member) {
    const error = new Error("Teknisyen bulunamadı")
    error.statusCode = 404
    throw error
  }

  const existingAssignment = await db.requestAssignment.findFirst({
    where: {
      requestId,
      memberId
    }
  })

  if (existingAssignment) {
    const error = new Error("Bu teknisyen zaten bu talebe atanmış")
    error.statusCode = 409
    throw error
  }

  const result = await (db === prisma ? prisma.$transaction.bind(prisma) : async fn => fn(db))(async (tx) => {
    const assignment = await tx.requestAssignment.create({
      data: {
        requestId,
        memberId
      }
    })

    const updatedRequest = await tx.serviceRequest.update({
      where: {
        id: requestId,
        companyId,
        status: serviceRequest.status
      },
      data: {
        status: "ASSIGNED"
      }
    })

    if (serviceRequest.status === "OPEN") {
      await tx.requestStatusHistory.create({
        data: { requestId, changedByMemberId: actorMemberId, oldStatus: "OPEN", newStatus: "ASSIGNED" }
      })
    }

    return {
      assignment,
      serviceRequest: updatedRequest
    }
  })

  return result
}

export { assignRequestService }