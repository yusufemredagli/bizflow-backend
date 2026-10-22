import { getDashboardSummaryService } from "../services/dashboard.service.js"


import {
  getAuditLogsService
} from "../services/auditLog.service.js"

const getDashboardSummary = async (
  req,
  res,
  next
) => {
  try {
    const {
      range = "7d"
    } = req.query


    const result =
      await getDashboardSummaryService(
        req.user.companyId,
        range
      )


    return res
      .status(200)
      .json({
        success: true,

        message:
          "Dashboard özeti başarıyla getirildi",

        data:
          result
      })

  } catch (error) {
    next(error)
  }
}

const getDashboardActivity = async (
  req,
  res,
  next
) => {
  try {
    const logs =
      await getAuditLogsService(
        req.user.companyId,
        10
      )

    return res.status(200).json({
      success: true,
      message:
        "Son aktiviteler getirildi",
      data: logs
    })

  } catch (error) {
    next(error)
  }
}


export {
  getDashboardSummary,
  getDashboardActivity
}
