import prisma from "../config/prisma.js"
import {
  createServiceRequestService,
  getServiceRequestsService,
  getServiceRequestService,
  getMyAssignedRequestsService
} from "../services/serviceRequest.service.js"

import {
  createAuditLogService
} from "../services/auditLog.service.js"


const createServiceRequest = async (
  req,
  res,
  next
) => {
  try {
    const result = await prisma.$transaction(async tx => {
      const result =
        await createServiceRequestService(
          req.body,
          req.user.companyId,
          tx
        )


      await createAuditLogService({
        companyId:
          req.user.companyId,

        userId:
          req.user.userId,

        action:
          "CREATE",

        entityType:
          "SERVICE_REQUEST",

        entityId:
          result.id,

        message:
          `${result.title} servis talebi oluşturuldu`,

        metadata: {
          priority:
            result.priority,

          customerId:
            result.customerId,

          scheduledAt:
            result.scheduledAt,

          slaDeadline:
            result.slaDeadline
        }
      }, tx)



        return result
    })

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Servis talebi oluşturuldu",

        data:
          result
      })

  } catch (error) {
    next(error)
  }
}


const getServiceRequests = async (
  req,
  res,
  next
) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      priority = "",
      filter = ""
    } = req.query


    const result =
      await getServiceRequestsService(
        req.user.companyId,
        {
          page,
          limit,
          search,
          status,
          priority,
          filter,
          technicianMemberId: req.user.role === "TECHNICIAN" ? req.member.id : undefined
        }
      )


    return res
      .status(200)
      .json({
        success: true,

        message:
          "Servis talepleri başarıyla getirildi",

        data:
          result.requests,

        meta:
          result.meta
      })

  } catch (error) {
    next(error)
  }
}


const getServiceRequest = async (
  req,
  res,
  next
) => {
  try {
    const id =
      Number(
        req.params.id
      )


    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      const error =
        new Error(
          "Geçersiz servis talebi ID"
        )

      error.statusCode = 400

      throw error
    }


    const result =
      await getServiceRequestService(
        id,
        req.user.companyId
      )


    return res
      .status(200)
      .json({
        success: true,

        message:
          "Servis talebi başarıyla getirildi",

        data:
          result
      })

  } catch (error) {
    next(error)
  }
}


const getMyAssignedRequests = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await getMyAssignedRequestsService(
        req.user.userId,
        req.user.companyId
      )


    return res
      .status(200)
      .json({
        success: true,

        message:
          "Atanan servis talepleri getirildi",

        data:
          result
      })

  } catch (error) {
    next(error)
  }
}


export {
  createServiceRequest,
  getServiceRequests,
  getServiceRequest,
  getMyAssignedRequests
}
