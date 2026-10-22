const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const error = new Error("Bu işlem için yetkiniz yok")
      error.statusCode = 403
      throw error
    }

    next()
  }
}

export {authorizeRoles}