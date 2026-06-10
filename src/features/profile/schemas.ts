import { z } from "zod";

export const NicknameBaseSchema = z
  .string()
  .min(3, "Nickname must be at least 3 characters")
  .max(20, "Nickname must be at most 20 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, underscores, and hyphens are allowed");

export const AvatarUploadMetaSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"], {
    error: "Only JPEG, PNG, or WebP files are allowed",
  }),
  sizeBytes: z.number().max(5 * 1024 * 1024, "File must be smaller than 5 MB"),
});

export type NicknameBaseInput = z.infer<typeof NicknameBaseSchema>;
export type AvatarUploadMeta = z.infer<typeof AvatarUploadMetaSchema>;
