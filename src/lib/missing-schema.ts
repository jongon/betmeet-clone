import { z } from "zod";
import { isValidStickerCode } from "@/lib/album-catalog";

export const OwnerEmailSchema = z.string().email();

export const MissingStickerCodeSchema = z
  .string()
  .min(3)
  .refine((code) => isValidStickerCode(code), "Código de cromo inválido");

export const MissingRecordSchema = z
  .record(z.string(), z.literal(true))
  .superRefine((items, ctx) => {
    for (const code of Object.keys(items)) {
      if (!isValidStickerCode(code)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [code],
          message: `Código de cromo inválido: ${code}`,
        });
      }
    }
  });

export const MissingInventorySchema = z.object({
  ownerEmail: OwnerEmailSchema,
  updatedAt: z.string(),
  items: MissingRecordSchema,
});

export const MissingInventoriesSchema = z.array(MissingInventorySchema);

export type MissingRecord = z.infer<typeof MissingRecordSchema>;
export type MissingInventory = z.infer<typeof MissingInventorySchema>;
