const fail = () => { throw Object.assign(new Error("Geçersiz sorgu parametreleri"), { statusCode: 400 }) }
export const validateQuery = (req, res, next) => {
  try {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value !== "string") fail()
      if (["page", "limit"].includes(key) && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 21474836)) fail()
      if (key === "search" && value.length > 200) fail()
      const enums = {
        status: ["", "OPEN", "ASSIGNED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
        priority: ["", "LOW", "NORMAL", "HIGH", "URGENT"],
        filter: ["", "today", "sla-risk", "overdue", "sla-completed"],
        range: ["7d", "30d", "90d", "all"]
      }
      if (enums[key] && !enums[key].includes(value)) fail()
    }
    next()
  } catch (error) { next(error) }
}
export const validateId = (req, res, next, value) => {
  const id = Number(value)
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
    return next(Object.assign(new Error("Geçersiz ID"), { statusCode: 400 }))
  }
  next()
}
