import { z } from "zod"

const completeServiceRequestSchema =
  z.object({
    completionNote:
      z.string()
        .trim()
        .min(
          5,
          "Yapılan işlem en az 5 karakter olmalı"
        )
        .max(
          5000,
          "Yapılan işlem çok uzun"
        ),

    materialsUsed:
      z.string()
        .trim()
        .max(
          5000,
          "Malzeme bilgisi çok uzun"
        )
        .optional()
        .or(
          z.literal("")
        ),

    customerNote:
      z.string()
        .trim()
        .max(
          5000,
          "Müşteri notu çok uzun"
        )
        .optional()
        .or(
          z.literal("")
        ),

    serviceFee:
      z.coerce
        .number()
        .min(
          0,
          "Servis ücreti negatif olamaz"
        )
        .max(
          99999999.99,
          "Servis ücreti çok yüksek"
        )
        .optional()
  })

export {
  completeServiceRequestSchema
}