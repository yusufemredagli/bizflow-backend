import prisma from "../config/prisma.js"
import {
  createCustomerService,
  getCustomersService,
  getCustomerService,
  updateCustomerService,
  deleteCustomerService
} from "../services/customer.services.js"

import {
  createAuditLogService
} from "../services/auditLog.service.js"


const parseCustomerId = (
  value
) => {
  const id =
    Number(value)

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    const error =
      new Error(
        "Geçersiz müşteri ID"
      )

    error.statusCode = 400

    throw error
  }

  return id
}


const createCustomer = async (
  req,
  res,
  next
) => {
  try {
    const result = await prisma.$transaction(async tx => {
      const result =
        await createCustomerService(
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
          "CUSTOMER",

        entityId:
          result.id,

        message:
          `${result.name} adlı müşteri oluşturuldu`
      }, tx)



        return result
    })

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Müşteri kaydı başarılı",

        data:
          result
      })

  } catch (error) {
    next(error)
  }
}


const getCustomers = async (
  req,
  res,
  next
) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = ""
    } = req.query


    const result =
      await getCustomersService(
        req.user.companyId,
        {
          page,
          limit,
          search
        }
      )


    return res
      .status(200)
      .json({
        success: true,

        message:
          "Müşteriler başarıyla getirildi",

        data:
          result.customers,

        meta:
          result.meta
      })

  } catch (error) {
    next(error)
  }
}


const getCustomer = async (
  req,
  res,
  next
) => {
  try {
    const id =
      parseCustomerId(
        req.params.id
      )


    const result =
      await getCustomerService(
        id,
        req.user.companyId
      )


    return res
      .status(200)
      .json({
        success: true,

        message:
          "Müşteri detayı başarıyla getirildi",

        data:
          result
      })

  } catch (error) {
    next(error)
  }
}


const updateCustomer = async (
  req,
  res,
  next
) => {
  try {
    const result = await prisma.$transaction(async tx => {
      const id =
        parseCustomerId(
          req.params.id
        )


      const result =
        await updateCustomerService(
          id,
          req.user.companyId,
          req.body,
          tx
        )


      await createAuditLogService({
        companyId:
          req.user.companyId,

        userId:
          req.user.userId,

        action:
          "UPDATE",

        entityType:
          "CUSTOMER",

        entityId:
          result.id,

        message:
          `${result.name} adlı müşterinin bilgileri güncellendi`
      }, tx)



        return result
    })

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Müşteri güncellendi",

        data:
          result
      })

  } catch (error) {
    next(error)
  }
}


const deleteCustomer = async (
  req,
  res,
  next
) => {
  try {
    const deletedCustomer = await prisma.$transaction(async tx => {
      const id =
        parseCustomerId(
          req.params.id
        )


      const deletedCustomer =
        await deleteCustomerService(
          id,
          req.user.companyId,
          tx
        )


      await createAuditLogService({
        companyId:
          req.user.companyId,

        userId:
          req.user.userId,

        action:
          "DELETE",

        entityType:
          "CUSTOMER",

        entityId:
          deletedCustomer.id,

        message:
          `${deletedCustomer.name} adlı müşteri silindi`
      }, tx)



        return deletedCustomer
    })

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Müşteri silindi"
      })

  } catch (error) {
    next(error)
  }
}


export {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer
}
