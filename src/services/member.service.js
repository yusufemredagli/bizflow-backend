import bcrypt from "bcrypt"

import prisma from "../config/prisma.js"


const createMemberService = async (
  data,
  companyId
) => {
  const {
    name,
    email,
    password,
    role
  } = data


  const existingUser =
    await prisma.user.findUnique({
      where: {
        email
      }
    })


  if (existingUser) {
    const error =
      new Error(
        "Bu email zaten kayıtlı"
      )

    error.statusCode = 409

    throw error
  }


  const passwordHash =
    await bcrypt.hash(
      password,
      12
    )


  const result =
    await prisma.$transaction(
      async tx => {
        const user =
          await tx.user.create({
            data: {
              name,
              email,
              passwordHash
            }
          })


        const membership =
          await tx.companyMember.create({
            data: {
              userId:
                user.id,

              companyId,

              role
            }
          })


        return {
          user,
          membership
        }
      }
    )


  const {
    passwordHash: _,
    ...safeUser
  } = result.user


  return {
    user:
      safeUser,

    membership:
      result.membership
  }
}


const getMembersService = async (
  companyId
) => {
  return prisma.companyMember.findMany({
    where: {
      companyId
    },

    select: {
      id: true,
      role: true,
      createdAt: true,

      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },

      _count: {
        select: {
          assignments:
            true
        }
      }
    },

    orderBy: {
      createdAt:
        "desc"
    }
  })
}


const getMemberService = async (
  id,
  companyId
) => {
  const member =
    await prisma.companyMember.findFirst({
      where: {
        id,
        companyId
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true
          }
        },

        assignments: {
          orderBy: {
            assignedAt:
              "desc"
          },

          include: {
            request: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    phone: true
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
        }
      }
    })


  if (!member) {
    const error =
      new Error(
        "Çalışan bulunamadı"
      )

    error.statusCode = 404

    throw error
  }


  const assignedRequests =
    member.assignments.map(
      assignment => ({
        assignmentId:
          assignment.id,

        assignedAt:
          assignment.assignedAt,

        ...assignment.request
      })
    )


  const totalAssigned =
    assignedRequests.length


  const activeRequests =
    assignedRequests.filter(
      request =>
        request.status !==
          "COMPLETED" &&
        request.status !==
          "CANCELLED"
    ).length


  const completedRequests =
    assignedRequests.filter(
      request =>
        request.status ===
        "COMPLETED"
    ).length


  const cancelledRequests =
    assignedRequests.filter(
      request =>
        request.status ===
        "CANCELLED"
    ).length


  const now =
    new Date()


  const startOfToday =
    new Date(now)

  startOfToday.setHours(
    0,
    0,
    0,
    0
  )


  const endOfToday =
    new Date(now)

  endOfToday.setHours(
    23,
    59,
    59,
    999
  )


  const todayAppointments =
    assignedRequests.filter(
      request => {
        if (
          !request.scheduledAt ||
          request.status ===
            "COMPLETED" ||
          request.status ===
            "CANCELLED"
        ) {
          return false
        }

        const scheduledAt =
          new Date(
            request.scheduledAt
          )

        return (
          scheduledAt >=
            startOfToday &&
          scheduledAt <=
            endOfToday
        )
      }
    ).length


  const slaRiskRequests =
    assignedRequests.filter(
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

        const remainingMs =
          new Date(
            request.slaDeadline
          ).getTime() -
          now.getTime()

        return (
          remainingMs > 0 &&
          remainingMs <=
            60 * 60 * 1000
        )
      }
    ).length


  const overdueRequests =
    assignedRequests.filter(
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
          now.getTime()
        )
      }
    ).length


  const totalRevenue =
    assignedRequests.reduce(
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


  const completionRate =
    totalAssigned > 0
      ? Math.round(
          (
            completedRequests /
            totalAssigned
          ) *
          100
        )
      : 0


  const lastCompletedRequest =
    assignedRequests.find(
      request =>
        request.status ===
        "COMPLETED"
    ) || null


  return {
    member: {
      id:
        member.id,

      role:
        member.role,

      createdAt:
        member.createdAt,

      user:
        member.user
    },

    summary: {
      totalAssigned,

      activeRequests,

      completedRequests,

      cancelledRequests,

      todayAppointments,

      slaRiskRequests,

      overdueRequests,

      totalRevenue,

      completionRate,

      lastCompletedAt:
        lastCompletedRequest
          ?.completedAt ||
        null
    },

    assignedRequests
  }
}


export {
  createMemberService,
  getMembersService,
  getMemberService
}