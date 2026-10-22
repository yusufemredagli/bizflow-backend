import prisma from "../config/prisma.js"


const createCustomerService = async (
  data,
  companyId,
  db = prisma
) => {
  const {
    name,
    email,
    phone,
    address
  } = data

  return db.customer.create({
    data: {
      companyId,
      name,
      email,
      phone,
      address
    }
  })
}


const getCustomersService = async (
  companyId,
  {
    page = 1,
    limit = 10,
    search = ""
  } = {}
) => {
  const currentPage =
    Math.max(
      Number(page) || 1,
      1
    )

  const currentLimit =
    Math.min(
      Math.max(
        Number(limit) || 10,
        1
      ),
      100
    )

  const skip =
    (currentPage - 1) *
    currentLimit

  const normalizedSearch =
    search.trim()


  const where = {
    companyId,

    ...(normalizedSearch && {
      OR: [
        {
          name: {
            contains:
              normalizedSearch
          }
        },

        {
          email: {
            contains:
              normalizedSearch
          }
        },

        {
          phone: {
            contains:
              normalizedSearch
          }
        },

        {
          address: {
            contains:
              normalizedSearch
          }
        }
      ]
    })
  }


  const [
    customers,
    total
  ] = await prisma.$transaction([

    prisma.customer.findMany({
      where,

      skip,

      take:
        currentLimit,

      orderBy: {
        createdAt:
          "desc"
      },

      include: {
        _count: {
          select: {
            serviceRequests:
              true
          }
        }
      }
    }),


    prisma.customer.count({
      where
    })

  ])


  return {
    customers,

    meta: {
      page:
        currentPage,

      limit:
        currentLimit,

      total,

      totalPages:
        Math.ceil(
          total /
          currentLimit
        )
    }
  }
}


const getCustomerService = async (
  id,
  companyId
) => {
  const customer =
    await prisma.customer.findFirst({
      where: {
        id,
        companyId
      },

      include: {
        serviceRequests: {
          orderBy: {
            createdAt:
              "desc"
          },

          include: {
            assignments: {
              include: {
                member: {
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
            },

            _count: {
              select: {
                attachments:
                  true
              }
            }
          }
        }
      }
    })


  if (!customer) {
    const error =
      new Error(
        "Müşteri bulunamadı"
      )

    error.statusCode = 404

    throw error
  }


  const serviceRequests =
    customer.serviceRequests


  const totalRequests =
    serviceRequests.length


  const completedRequests =
    serviceRequests.filter(
      request =>
        request.status ===
        "COMPLETED"
    ).length


  const cancelledRequests =
    serviceRequests.filter(
      request =>
        request.status ===
        "CANCELLED"
    ).length


  const activeRequests =
    serviceRequests.filter(
      request =>
        request.status !==
          "COMPLETED" &&
        request.status !==
          "CANCELLED"
    ).length


  const slaRiskRequests =
    serviceRequests.filter(
      request => {
        if (
          !request.slaDeadline ||
          request.status ===
            "COMPLETED" ||
          request.status ===
            "CANCELLED"
        ) {
          return false
        }

        const now =
          Date.now()

        const deadline =
          new Date(
            request.slaDeadline
          ).getTime()

        const remaining =
          deadline - now

        return (
          remaining > 0 &&
          remaining <=
            60 * 60 * 1000
        )
      }
    ).length


  const overdueRequests =
    serviceRequests.filter(
      request => {
        if (
          !request.slaDeadline ||
          request.status ===
            "COMPLETED" ||
          request.status ===
            "CANCELLED"
        ) {
          return false
        }

        return (
          new Date(
            request.slaDeadline
          ).getTime() <
          Date.now()
        )
      }
    ).length


  const totalRevenue =
    serviceRequests.reduce(
      (
        total,
        request
      ) => {
        if (
          request.status !==
          "COMPLETED" ||
          request.serviceFee ===
            null ||
          request.serviceFee ===
            undefined
        ) {
          return total
        }

        return (
          total +
          Number(
            request.serviceFee
          )
        )
      },
      0
    )


  const latestRequest =
    serviceRequests[0] ||
    null


  const lastCompletedRequest =
    serviceRequests.find(
      request =>
        request.status ===
        "COMPLETED"
    ) || null


  const {
    serviceRequests:
      ignoredServiceRequests,
    ...customerData
  } = customer


  return {
    customer:
      customerData,

    summary: {
      totalRequests,

      activeRequests,

      completedRequests,

      cancelledRequests,

      slaRiskRequests,

      overdueRequests,

      totalRevenue,

      lastServiceAt:
        latestRequest
          ?.createdAt ||
        null,

      lastCompletedAt:
        lastCompletedRequest
          ?.completedAt ||
        null
    },

    serviceRequests
  }
}


const updateCustomerService = async (
  id,
  companyId,
  data,
  db = prisma
) => {
  const customer =
    await db.customer.findFirst({
      where: {
        id,
        companyId
      }
    })


  if (!customer) {
    const error =
      new Error(
        "Müşteri bulunamadı"
      )

    error.statusCode = 404

    throw error
  }


  return db.customer.update({
    where: {
      id
    },

    data
  })
}


const deleteCustomerService = async (
  id,
  companyId,
  db = prisma
) => {
  const customer =
    await db.customer.findFirst({
      where: {
        id,
        companyId
      },

      include: {
        _count: {
          select: {
            serviceRequests:
              true
          }
        }
      }
    })


  if (!customer) {
    const error =
      new Error(
        "Müşteri bulunamadı"
      )

    error.statusCode = 404

    throw error
  }


  if (
    customer._count
      .serviceRequests > 0
  ) {
    const error =
      new Error(
        "Servis geçmişi bulunan müşteri silinemez"
      )

    error.statusCode = 409

    throw error
  }


  return db.customer.delete({
    where: {
      id
    }
  })
}


export {
  createCustomerService,
  getCustomersService,
  getCustomerService,
  updateCustomerService,
  deleteCustomerService
}