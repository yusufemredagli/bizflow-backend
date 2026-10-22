import fs from "node:fs/promises"
import prisma from "../config/prisma.js"

import {
  createAttachmentService,
  getAttachmentsService,
  deleteAttachmentService,
  removeAttachmentFile,
  getAttachmentContentService
} from "../services/attachment.service.js"

import {
  createAuditLogService
} from "../services/auditLog.service.js"


const uploadAttachment = async (
  req,
  res,
  next
) => {
  try {
    const result = await prisma.$transaction(async tx => {
      const requestId =
        Number(req.params.id)

      if (!req.file) {
        const error =
          new Error(
            "Yüklenecek dosya bulunamadı"
          )

        error.statusCode = 400
        throw error
      }

      const membership =
        await tx.companyMember.findFirst({
          where: {
            userId:
              req.user.userId,

            companyId:
              req.user.companyId
          },

          select: {
            id: true
          }
        })

      if (!membership) {
        const error =
          new Error(
            "Şirket üyeliği bulunamadı"
          )

        error.statusCode = 403
        throw error
      }

      const result =
        await createAttachmentService({
          requestId,
          companyId:
            req.user.companyId,

          memberId:
            membership.id,

          file:
            req.file
        }, tx)

      await createAuditLogService({
        companyId:
          req.user.companyId,

        userId:
          req.user.userId,

        action:
          "CREATE",

        entityType:
          "ATTACHMENT",

        entityId:
          result.id,

        message:
          `${req.file.originalname} dosyası servis talebine eklendi`,

        metadata: {
          requestId,
          mimeType:
            req.file.mimetype,

          fileSize:
            req.file.size
        }
      }, tx)


        return result
    })
    req.attachmentSaved = true

    return res.status(201).json({
      success: true,
      message:
        "Dosya başarıyla yüklendi",
      data: result
    })

  } catch (error) {
    if (req.file && !req.attachmentSaved) {
      await fs.unlink(req.file.path).catch(cleanupError => {
        if (cleanupError.code !== "ENOENT") console.error("Upload cleanup failed", { code: cleanupError.code })
      })
    }
    next(error)
  }
}


const getAttachments = async (
  req,
  res,
  next
) => {
  try {
    const requestId =
      Number(req.params.id)

    const result =
      await getAttachmentsService(
        requestId,
        req.user.companyId
      )

    return res.status(200).json({
      success: true,
      message:
        "Dosyalar getirildi",
      data: result
    })

  } catch (error) {
    next(error)
  }
}

const deleteAttachment = async (
  req,
  res,
  next
) => {
  try {
    const deleted = await prisma.$transaction(async tx => {
      const requestId =
        Number(
          req.params.id
        )

      const attachmentId =
        Number(
          req.params.attachmentId
        )


      const deleted =
        await deleteAttachmentService({
          attachmentId,

          requestId,

          companyId:
            req.user.companyId
        }, tx)


      await createAuditLogService({
        companyId:
          req.user.companyId,

        userId:
          req.user.userId,

        action:
          "DELETE",

        entityType:
          "ATTACHMENT",

        entityId:
          deleted.id,

        message:
          `${deleted.originalName} dosyası servis talebinden silindi`,

        metadata: {
          requestId,

          fileName:
            deleted.originalName
        }
      }, tx)



        return deleted
    })
    await removeAttachmentFile(deleted).catch(error => {
      console.error("Attachment cleanup failed", { attachmentId: deleted.id, code: error.code })
    })

    return res.status(200).json({
      success: true,

      message:
        "Dosya başarıyla silindi"
    })

  } catch (error) {
    next(error)
  }
}

export {
  uploadAttachment,
  getAttachments,
  deleteAttachment
}

export const getAttachmentContent = async (req, res, next) => {
  try {
    const { filePath, mimeType } = await getAttachmentContentService(
      Number(req.params.attachmentId), req.user, req.member.id
    )
    res.set({
      "Content-Type": mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox"
    })
    res.vary("Authorization")
    res.sendFile(filePath, { cacheControl: false, lastModified: false, acceptRanges: false }, error => {
      if (error) next(error.code === "ENOENT"
        ? Object.assign(new Error("Dosya bulunamadı"), { statusCode: 404 }) : error)
    })
  } catch (error) { next(error) }
}
