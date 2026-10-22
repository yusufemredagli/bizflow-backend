import multer from "multer"
import path from "path"
import crypto from "crypto"
import fs from "node:fs"

const extensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" }
fs.mkdirSync(path.resolve("uploads"), { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/")
  },

  filename: (req, file, cb) => {
    const extension =
      extensions[file.mimetype]

    const randomName =
      crypto.randomUUID()

    cb(
      null,
      `${randomName}${extension}`
    )
  }
})

const fileFilter = (
  req,
  file,
  cb
) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
  ]

  if (
    !allowedTypes.includes(
      file.mimetype
    )
  ) {
    return cb(
      Object.assign(new Error("Desteklenmeyen dosya türü"), { statusCode: 400 })
    )
  }

  cb(null, true)
}

const upload = multer({
  storage,
  fileFilter,

  limits: {
    files: 1,
    fields: 10,
    parts: 11,
    fileSize:
      10 * 1024 * 1024
  }
})

export { upload }