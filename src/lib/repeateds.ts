import { z } from "zod";

const StickerCodeSchema = z.string().min(3);
const QuantitySchema = z.number().int().min(0);
const RepeatedsRecordSchema = z.record(StickerCodeSchema, QuantitySchema);

const RepeatedInventorySchema = z.object({
  ownerEmail: z.string().email(),
  updatedAt: z.string(),
  items: RepeatedsRecordSchema,
});

export const RepeatedInventoriesSchema = z.array(RepeatedInventorySchema);

export type RepeatedInventory = z.infer<typeof RepeatedInventorySchema>;
export type RepeatedsRecord = z.infer<typeof RepeatedsRecordSchema>;
