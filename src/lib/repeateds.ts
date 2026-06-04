import { z } from "zod";

export const StickerCodeSchema = z.string().min(3);
export const QuantitySchema = z.number().int().min(0);

export const RepeatedsRecordSchema = z.record(StickerCodeSchema, QuantitySchema);

export const RepeatedInventorySchema = z.object({
  ownerEmail: z.string().email(),
  updatedAt: z.string(),
  items: RepeatedsRecordSchema,
});

export const RepeatedInventoriesSchema = z.array(RepeatedInventorySchema);

export type RepeatedInventory = z.infer<typeof RepeatedInventorySchema>;
export type RepeatedsRecord = z.infer<typeof RepeatedsRecordSchema>;
