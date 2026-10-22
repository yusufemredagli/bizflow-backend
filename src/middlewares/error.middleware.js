const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error)
  let statusCode = error.statusCode || error.status || 500
  let message = error.message
  const mapped = {
    P2002: [409, "Bu kayıt zaten mevcut"],
    P2003: [409, "İlişkili kayıtlar nedeniyle işlem yapılamadı"],
    P2025: [409, "Kayıt değişmiş veya bulunamadı; lütfen yenileyin"],
    P2000: [400, "Girilen değer çok uzun"],
    P2034: [409, "Eşzamanlı işlem çakışması; lütfen tekrar deneyin"]
  }
  if (mapped[error.code]) [statusCode, message] = mapped[error.code]
  if (error.name === "MulterError") {
    statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400
    message = "Dosya yükleme sınırı aşıldı veya geçersiz dosya alanı"
  }
  if (error.type === "entity.parse.failed") message = "Geçersiz JSON"
  if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) statusCode = 500
  if (statusCode >= 500) {
    console.error("Request failed", { code: error.code, name: error.name })
    message = "Sunucu hatası"
  }
  return res.status(statusCode).json({ success: false, message: message || "Sunucu hatası" })
}
export { errorHandler }
