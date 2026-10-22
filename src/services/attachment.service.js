import fs from "fs/promises"
import path from "path"

import prisma from "../config/prisma.js"


const createAttachmentService = async ({
  requestId,
  companyId,
  memberId,
  file
}, db = prisma) => {
  const handle = await fs.open(file.path, "r")
  const bytes = Buffer.alloc(12)
  try { await handle.read(bytes, 0, 12, 0) } finally { await handle.close() }
  const valid = {
    "image/jpeg": bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])),
    "image/png": bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/webp": bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP",
    "application/pdf": bytes.toString("ascii", 0, 5) === "%PDF-"
  }[file.mimetype]
  if (!valid || file.originalname.length > 191) {
    throw Object.assign(new Error("Geçersiz dosya içeriği veya dosya adı"), { statusCode: 400 })
  }

  const serviceRequest =
    await db.serviceRequest.findFirst({
      where: {
        id: requestId,
        companyId
      }
    })

  if (!serviceRequest) {
    const error =
      new Error(
        "Servis talebi bulunamadı"
      )

    error.statusCode = 404
    throw error
  }

  return db.serviceRequestAttachment.create({
    data: {
      requestId,

      uploadedById:
        memberId,

      fileName:
        file.filename,

      originalName:
        file.originalname,

      mimeType:
        file.mimetype,

      fileSize:
        file.size,

      filePath:
        `/uploads/${file.filename}`
    }
  })
}


const getAttachmentsService = async (
  requestId,
  companyId
) => {
  const serviceRequest =
    await prisma.serviceRequest.findFirst({
      where: {
        id: requestId,
        companyId
      },

      select: {
        id: true
      }
    })

  if (!serviceRequest) {
    const error =
      new Error(
        "Servis talebi bulunamadı"
      )

    error.statusCode = 404
    throw error
  }

  return prisma.serviceRequestAttachment.findMany({
    where: {
      requestId
    },

    include: {
      uploadedBy: {
        select: {
          id: true,

          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },

    orderBy: {
      createdAt:
        "desc"
    }
  })
}


const deleteAttachmentService = async ({
  attachmentId,
  requestId,
  companyId
}, db = prisma) => {
  const attachment =
    await db.serviceRequestAttachment.findFirst({
      where: {
        id:
          attachmentId,

        requestId,

        request: {
          companyId
        }
      }
    })

  if (!attachment) {
    const error =
      new Error(
        "Dosya bulunamadı"
      )

    error.statusCode = 404
    throw error
  }


  await db.serviceRequestAttachment.delete({
    where: {
      id:
        attachment.id
    }
  })


  if (db === prisma) await removeAttachmentFile(attachment)
  return attachment
}

const removeAttachmentFile = async attachment => {
  const physicalPath =
    path.join(
      process.cwd(),
      "uploads",
      path.basename(attachment.fileName)
    )


  try {
    await fs.unlink(
      physicalPath
    )
  } catch (error) {
    if (
      error.code !==
      "ENOENT"
    ) {
      throw error
    }
  }

}


export {
  createAttachmentService,
  getAttachmentsService,
  deleteAttachmentService,
  removeAttachmentFile
}
// Only database-selected filenames can resolve into the private uploads directory.
export const getAttachmentContentService = async (attachmentId, user, memberId) => {
  const attachment = await prisma.serviceRequestAttachment.findFirst({
    where: {
      id: attachmentId,
      request: {
        companyId: user.companyId,
        ...(user.role === "TECHNICIAN" && {
          assignments: { some: { memberId } }
        })
      }
    }
  })
  const notFound = () => Object.assign(new Error("Dosya bulunamadı"), { statusCode: 404 })
  if (!attachment) throw notFound()
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
  if (!allowedTypes.includes(attachment.mimeType) ||
      !attachment.fileName || attachment.fileName.includes("\\") ||
      attachment.fileName !== path.basename(attachment.fileName) ||
      [".", ".."].includes(attachment.fileName)) throw notFound()
  try {
    const root = await fs.realpath(path.resolve("uploads"))
    const filePath = await fs.realpath(path.resolve(root, attachment.fileName))
    if (!filePath.startsWith(root + path.sep) || !(await fs.stat(filePath)).isFile()) throw notFound()
    return { filePath, mimeType: attachment.mimeType }
  } catch (error) {
    if (["ENOENT", "ENOTDIR", "ELOOP"].includes(error.code)) throw notFound()
    throw error
  }
}
