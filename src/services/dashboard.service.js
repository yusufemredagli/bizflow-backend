import prisma from "../config/prisma.js"


const getRangeStart = (
  range,
  now
) => {
  const start =
    new Date(now)

  start.setHours(
    0,
    0,
    0,
    0
  )

  if (range === "7d") {
    start.setDate(
      start.getDate() - 6
    )

    return start
  }


  if (range === "30d") {
    start.setDate(
      start.getDate() - 29
    )

    return start
  }


  if (range === "90d") {
    start.setDate(
      start.getDate() - 89
    )

    return start
  }


  return null
}


const normalizeRange = (
  range
) => {
  const allowed = [
    "7d",
    "30d",
    "90d",
    "all"
  ]

  return allowed.includes(range)
    ? range
    : "7d"
}


const startOfDay = (
  value
) => {
  const date =
    new Date(value)

  date.setHours(
    0,
    0,
    0,
    0
  )

  return date
}


const endOfDay = (
  value
) => {
  const date =
    new Date(value)

  date.setHours(
    23,
    59,
    59,
    999
  )

  return date
}


const createTrend = ({
  range,
  startDate,
  now,
  requests
}) => {
  if (
    range === "all"
  ) {
    return createMonthlyTrend(
      now,
      requests
    )
  }


  const bucketDays =
    range === "7d"
      ? 1
      : range === "30d"
        ? 3
        : 7


  const trend = []

  let cursor =
    startOfDay(
      startDate
    )


  while (
    cursor <= now
  ) {
    const bucketStart =
      startOfDay(
        cursor
      )

    const bucketEnd =
      endOfDay(
        new Date(
          cursor.getFullYear(),
          cursor.getMonth(),
          cursor.getDate() +
            bucketDays -
            1
        )
      )


    if (
      bucketEnd > now
    ) {
      bucketEnd.setTime(
        now.getTime()
      )
    }


    const created =
      requests.filter(
        request => {
          const date =
            new Date(
              request.createdAt
            )

          return (
            date >=
              bucketStart &&
            date <=
              bucketEnd
          )
        }
      ).length


    const completed =
      requests.filter(
        request => {
          if (
            !request.completedAt
          ) {
            return false
          }

          const date =
            new Date(
              request.completedAt
            )

          return (
            date >=
              bucketStart &&
            date <=
              bucketEnd
          )
        }
      ).length


    trend.push({
      date:
        bucketStart
          .toISOString()
          .slice(
            0,
            10
          ),

      created,
      completed
    })


    cursor =
      new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate() +
          bucketDays
      )
  }


  return trend
}


const createMonthlyTrend = (
  now,
  requests
) => {
  if (
    requests.length === 0
  ) {
    return [
      {
        date:
          new Date(
            now.getFullYear(),
            now.getMonth(),
            1
          )
            .toISOString()
            .slice(
              0,
              10
            ),

        created: 0,
        completed: 0
      }
    ]
  }


  const dates =
    requests.flatMap(
      request => [
        new Date(
          request.createdAt
        ),

        request.completedAt
          ? new Date(
              request.completedAt
            )
          : null
      ]
    )
      .filter(Boolean)


  const earliest =
    new Date(
      Math.min(
        ...dates.map(
          date =>
            date.getTime()
        )
      )
    )


  let cursor =
    new Date(
      earliest.getFullYear(),
      earliest.getMonth(),
      1
    )


  const trend = []


  while (
    cursor <= now
  ) {
    const monthStart =
      new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        1,
        0,
        0,
        0,
        0
      )


    const monthEnd =
      new Date(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      )


    const created =
      requests.filter(
        request => {
          const date =
            new Date(
              request.createdAt
            )

          return (
            date >=
              monthStart &&
            date <=
              monthEnd
          )
        }
      ).length


    const completed =
      requests.filter(
        request => {
          if (
            !request.completedAt
          ) {
            return false
          }

          const date =
            new Date(
              request.completedAt
            )

          return (
            date >=
              monthStart &&
            date <=
              monthEnd
          )
        }
      ).length


    trend.push({
      date:
        monthStart
          .toISOString()
          .slice(
            0,
            10
          ),

      created,
      completed
    })


    cursor =
      new Date(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        1
      )
  }


  return trend
}


const getDashboardSummaryService =
  async (
    companyId,
    rangeValue = "7d"
  ) => {
    const range =
      normalizeRange(
        rangeValue
      )


    const now =
      new Date()


    const rangeStart =
      getRangeStart(
        range,
        now
      )


    const todayStart =
      startOfDay(
        now
      )


    const todayEnd =
      endOfDay(
        now
      )


    const oneHourLater =
      new Date(
        now.getTime() +
        60 *
        60 *
        1000
      )


    const completedWhere = {
      companyId,

      status:
        "COMPLETED",

      ...(rangeStart && {
        completedAt: {
          gte:
            rangeStart,

          lte:
            now
        }
      })
    }


    const trendWhere =
      rangeStart
        ? {
            companyId,

            OR: [
              {
                createdAt: {
                  gte:
                    rangeStart,

                  lte:
                    now
                }
              },

              {
                completedAt: {
                  gte:
                    rangeStart,

                  lte:
                    now
                }
              }
            ]
          }
        : {
            companyId
          }


    const [
      customerCount,
      openCount,
      assignedCount,
      onTheWayCount,
      inProgressCount,
      completedCount,
      cancelledCount,
      technicianCount,
      todayAppointmentsCount,
      slaRiskCount,
      overdueCount,
      completedRequests,
      trendRequests,
      technicians
    ] =
      await Promise.all([

        prisma.customer.count({
          where: {
            companyId
          }
        }),


        prisma.serviceRequest.count({
          where: {
            companyId,
            status:
              "OPEN"
          }
        }),


        prisma.serviceRequest.count({
          where: {
            companyId,
            status:
              "ASSIGNED"
          }
        }),


        prisma.serviceRequest.count({
          where: {
            companyId,
            status:
              "ON_THE_WAY"
          }
        }),


        prisma.serviceRequest.count({
          where: {
            companyId,
            status:
              "IN_PROGRESS"
          }
        }),


        prisma.serviceRequest.count({
          where: {
            companyId,
            status:
              "COMPLETED"
          }
        }),


        prisma.serviceRequest.count({
          where: {
            companyId,
            status:
              "CANCELLED"
          }
        }),


        prisma.companyMember.count({
          where: {
            companyId,
            role:
              "TECHNICIAN"
          }
        }),


        prisma.serviceRequest.count({
          where: {
            companyId,

            scheduledAt: {
              gte:
                todayStart,

              lte:
                todayEnd
            },

            status: {
              notIn: [
                "COMPLETED",
                "CANCELLED"
              ]
            }
          }
        }),


        prisma.serviceRequest.count({
          where: {
            companyId,

            slaDeadline: {
              gt:
                now,

              lte:
                oneHourLater
            },

            status: {
              notIn: [
                "COMPLETED",
                "CANCELLED"
              ]
            }
          }
        }),


        prisma.serviceRequest.count({
          where: {
            companyId,

            slaDeadline: {
              lt:
                now
            },

            status: {
              notIn: [
                "COMPLETED",
                "CANCELLED"
              ]
            }
          }
        }),


        prisma.serviceRequest.findMany({
          where:
            completedWhere,

          select: {
            id:
              true,

            createdAt:
              true,

            completedAt:
              true,

            slaDeadline:
              true,

            serviceFee:
              true
          }
        }),


        prisma.serviceRequest.findMany({
          where:
            trendWhere,

          select: {
            id:
              true,

            createdAt:
              true,

            completedAt:
              true
          }
        }),


        prisma.companyMember.findMany({
          where: {
            companyId,

            role:
              "TECHNICIAN"
          },

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
            },

            assignments: {
              select: {
                request: {
                  select: {
                    id:
                      true,

                    status:
                      true,

                    completedAt:
                      true,

                    serviceFee:
                      true
                  }
                }
              }
            }
          }
        })

      ])


    const totalRevenue =
      completedRequests.reduce(
        (
          total,
          request
        ) =>
          total +
          Number(
            request.serviceFee ||
            0
          ),
        0
      )


    const durations =
      completedRequests
        .filter(
          request =>
            request.completedAt
        )
        .map(
          request =>
            (
              new Date(
                request.completedAt
              ).getTime() -
              new Date(
                request.createdAt
              ).getTime()
            ) /
            (
              1000 *
              60 *
              60
            )
        )
        .filter(
          hours =>
            Number.isFinite(
              hours
            ) &&
            hours >= 0
        )


    const averageCompletionHours =
      durations.length > 0
        ? Number(
            (
              durations.reduce(
                (
                  total,
                  value
                ) =>
                  total +
                  value,
                0
              ) /
              durations.length
            ).toFixed(
              1
            )
          )
        : 0


    const completedWithSla =
      completedRequests.filter(
        request =>
          request.slaDeadline &&
          request.completedAt
      )


    const slaSuccessful =
      completedWithSla.filter(
        request =>
          new Date(
            request.completedAt
          ).getTime() <=
          new Date(
            request.slaDeadline
          ).getTime()
      ).length


    const slaSuccessRate =
      completedWithSla.length > 0
        ? Math.round(
            (
              slaSuccessful /
              completedWithSla.length
            ) *
            100
          )
        : null


    const technicianPerformance =
      technicians.map(
        technician => {
          const requests =
            technician.assignments.map(
              assignment =>
                assignment.request
            )


          const completed =
            requests.filter(
              request => {
                if (
                  request.status !==
                  "COMPLETED" ||
                  !request.completedAt
                ) {
                  return false
                }


                if (
                  !rangeStart
                ) {
                  return true
                }


                return (
                  new Date(
                    request.completedAt
                  ) >=
                  rangeStart
                )
              }
            )


          const active =
            requests.filter(
              request =>
                request.status !==
                  "COMPLETED" &&
                request.status !==
                  "CANCELLED"
            )


          const revenue =
            completed.reduce(
              (
                total,
                request
              ) =>
                total +
                Number(
                  request.serviceFee ||
                  0
                ),
              0
            )


          return {
            id:
              technician.id,

            name:
              technician.user.name,

            activeCount:
              active.length,

            completedCount:
              completed.length,

            revenue
          }
        }
      )


    technicianPerformance.sort(
      (
        a,
        b
      ) =>
        b.completedCount -
          a.completedCount ||
        b.revenue -
          a.revenue
    )


    const topTechnician =
      technicianPerformance.find(
        technician =>
          technician.completedCount >
          0
      ) ||
      null


    const trend =
      createTrend({
        range,
        startDate:
          rangeStart,
        now,
        requests:
          trendRequests
      })


    return {
      range,

      customers:
        customerCount,

      technicians:
        technicianCount,

      serviceRequests: {
        open:
          openCount,

        assigned:
          assignedCount,

        onTheWay:
          onTheWayCount,

        inProgress:
          inProgressCount,

        completed:
          completedCount,

        cancelled:
          cancelledCount
      },

      operations: {
        todayAppointments:
          todayAppointmentsCount,

        slaRisk:
          slaRiskCount,

        overdue:
          overdueCount
      },

      performance: {
        totalRevenue,

        slaSuccessRate,

        slaSampleSize:
          completedWithSla.length,

        averageCompletionHours,

        topTechnician,

        technicianPerformance,

        trend
      }
    }
  }


export {
  getDashboardSummaryService
}