import prisma from "../config/prisma.js"


const createServiceRequestService = async (
  data,
  companyId,
  db = prisma
) => {
  const {
    customerId,
    title,
    description,
    priority,
    scheduledAt,
    slaHours
  } = data


  const customer =
    await db.customer.findFirst({
      where: {
        id:
          customerId,

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


  let scheduledDate =
    null

  let slaDeadline =
    null


  if (scheduledAt) {
    scheduledDate =
      new Date(
        scheduledAt
      )


    if (
      Number.isNaN(
        scheduledDate
          .getTime()
      )
    ) {
      const error =
        new Error(
          "Geçersiz randevu tarihi"
        )

      error.statusCode = 400

      throw error
    }
  }


  if (
    scheduledDate &&
    slaHours
  ) {
    slaDeadline =
      new Date(
        scheduledDate
          .getTime() +
        Number(
          slaHours
        ) *
        60 *
        60 *
        1000
      )
  }


  const serviceRequest =
    await db.serviceRequest.create({
      data: {
        companyId,
        customerId,
        title,
        description,
        priority,

        scheduledAt:
          scheduledDate,

        slaDeadline
      }
    })


  return serviceRequest
}


const getServiceRequestsService =
  async (
    companyId,
    {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      priority = "",
      filter = "",
      technicianMemberId
    } = {}
  ) => {
    const currentPage =
      Math.max(
        Number(page) ||
        1,
        1
      )


    const currentLimit =
      Math.min(
        Math.max(
          Number(limit) ||
          10,
          1
        ),
        100
      )


    const skip =
      (
        currentPage -
        1
      ) *
      currentLimit


    const normalizedSearch =
      String(
        search
      ).trim()


    const normalizedStatus =
      String(
        status
      ).trim()


    const normalizedPriority =
      String(
        priority
      ).trim()


    const normalizedFilter =
      String(
        filter
      ).trim()


    const now =
      new Date()


    const startOfToday =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      )


    const endOfToday =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      )


    const oneHourLater =
      new Date(
        now.getTime() +
        60 *
        60 *
        1000
      )


    const where = {
      companyId,
      ...(technicianMemberId && { assignments: { some: { memberId: technicianMemberId } } })
    }


    if (
      normalizedStatus
    ) {
      where.status =
        normalizedStatus
    }


    if (
      normalizedPriority
    ) {
      where.priority =
        normalizedPriority
    }


    if (
      normalizedSearch
    ) {
      where.OR = [
        {
          title: {
            contains:
              normalizedSearch
          }
        },

        {
          description: {
            contains:
              normalizedSearch
          }
        },

        {
          customer: {
            is: {
              name: {
                contains:
                  normalizedSearch
              }
            }
          }
        },

        {
          customer: {
            is: {
              phone: {
                contains:
                  normalizedSearch
              }
            }
          }
        },

        {
          customer: {
            is: {
              address: {
                contains:
                  normalizedSearch
              }
            }
          }
        }
      ]
    }


    if (
      normalizedFilter ===
      "today"
    ) {
      where.scheduledAt = {
        gte:
          startOfToday,

        lte:
          endOfToday
      }

      where.status = {
        notIn: [
          "COMPLETED",
          "CANCELLED"
        ]
      }
    }


    if (
      normalizedFilter ===
      "sla-risk"
    ) {
      where.slaDeadline = {
        gt:
          now,

        lte:
          oneHourLater
      }

      where.status = {
        notIn: [
          "COMPLETED",
          "CANCELLED"
        ]
      }
    }


    if (
      normalizedFilter ===
      "overdue"
    ) {
      where.slaDeadline = {
        lt:
          now
      }

      where.status = {
        notIn: [
          "COMPLETED",
          "CANCELLED"
        ]
      }
    }


    if (
      normalizedFilter ===
      "sla-completed"
    ) {
      where.status =
        "COMPLETED"

      where.slaDeadline = {
        not:
          null
      }

      where.completedAt = {
        not:
          null
      }
    }


    const [
      requests,
      total
    ] =
      await prisma.$transaction([
        prisma
          .serviceRequest
          .findMany({
            where,

            skip,

            take:
              currentLimit,

            include: {
              customer: {
                select: {
                  id:
                    true,

                  name:
                    true,

                  email:
                    true,

                  phone:
                    true,

                  address:
                    true
                }
              },

              assignments: {
                include: {
                  member: {
                    select: {
                      id:
                        true,

                      role:
                        true,

                      user: {
                        select: {
                          id:
                            true,

                          name:
                            true,

                          email:
                            true
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
            },

            orderBy: {
              createdAt:
                "desc"
            }
          }),


        prisma
          .serviceRequest
          .count({
            where
          })
      ])


    return {
      requests,

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


const getServiceRequestService =
  async (
    id,
    companyId
  ) => {
    const serviceRequest =
      await prisma.serviceRequest.findFirst({
        where: {
          id,
          companyId
        },

        include: {
          customer: {
            select: {
              id:
                true,

              name:
                true,

              email:
                true,

              phone:
                true,

              address:
                true
            }
          },

          assignments: {
            include: {
              member: {
                select: {
                  id:
                    true,

                  role:
                    true,

                  user: {
                    select: {
                      id:
                        true,

                      name:
                        true,

                      email:
                        true
                    }
                  }
                }
              }
            }
          },

          statusHistory: {
            orderBy: {
              createdAt:
                "desc"
            },

            include: {
              changedBy: {
                select: {
                  id:
                    true,

                  role:
                    true,

                  user: {
                    select: {
                      id:
                        true,

                      name:
                        true
                    }
                  }
                }
              }
            }
          },

          attachments: {
            orderBy: {
              createdAt:
                "desc"
            },

            include: {
              uploadedBy: {
                select: {
                  id:
                    true,

                  user: {
                    select: {
                      id:
                        true,

                      name:
                        true
                    }
                  }
                }
              }
            }
          }
        }
      })


    if (
      !serviceRequest
    ) {
      const error =
        new Error(
          "Servis talebi bulunamadı"
        )

      error.statusCode =
        404

      throw error
    }


    return serviceRequest
  }


const getMyAssignedRequestsService =
  async (
    userId,
    companyId
  ) => {
    const membership =
      await prisma.companyMember.findFirst({
        where: {
          userId,
          companyId,

          role:
            "TECHNICIAN"
        },

        select: {
          id:
            true
        }
      })


    if (
      !membership
    ) {
      const error =
        new Error(
          "Teknisyen üyeliği bulunamadı"
        )

      error.statusCode =
        403

      throw error
    }


    const assignments =
      await prisma.requestAssignment.findMany({
        where: {
          memberId:
            membership.id
        },

        include: {
          request: {
            include: {
              customer: {
                select: {
                  id:
                    true,

                  name:
                    true,

                  email:
                    true,

                  phone:
                    true,

                  address:
                    true
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
        },

        orderBy: {
          assignedAt:
            "desc"
        }
      })


    return assignments
  }


export {
  createServiceRequestService,
  getServiceRequestsService,
  getServiceRequestService,
  getMyAssignedRequestsService
}