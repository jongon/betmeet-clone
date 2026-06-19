import { z } from "zod";

/** Pool creation input (US-4.1, BR-3.1/BR-3.3). */
export const CreatePoolSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(60, "El nombre debe tener como máximo 60 caracteres"),
  type: z.enum(["PUBLIC", "PRIVATE"]),
  capacity: z
    .number()
    .int("La capacidad debe ser un número entero")
    .min(2, "El mínimo es 2 participantes")
    .max(100, "El máximo es 100 participantes"),
  membersCanInvite: z.boolean().default(true), // Unit 45: BR-3.36, FR-REFINE-45.1
});

export type CreatePoolInput = z.infer<typeof CreatePoolSchema>;

/** Join-by-token input (US-4.2). */
export const JoinByTokenSchema = z.object({
  token: z.string().trim().min(6, "Código inválido").max(12, "Código inválido"),
});

export type JoinByTokenInput = z.infer<typeof JoinByTokenSchema>;

export const CreateDirectedInviteSchema = z.object({
  poolId: z.string().uuid(),
  target: z
    .string()
    .trim()
    .min(3, "Ingresa un nickname o email válido")
    .max(120, "El destinatario es demasiado largo"),
});

export type CreateDirectedInviteInput = z.infer<typeof CreateDirectedInviteSchema>;

export const SearchNicknameSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, "Minimo 2 caracteres")
    .max(30, "Demasiado largo")
    // Base obligatoria; sufijo opcional `#` + hasta 4 digitos para afinar por discriminador.
    .regex(/^[a-zA-Z0-9_-]+(#[0-9]{0,4})?$/, "Solo letras, numeros, guiones y opcional #1234"),
});

export type SearchNicknameInput = z.infer<typeof SearchNicknameSchema>;

/** Update pool membersCanInvite flag (FR-REFINE-45.4, BR-3.35, BR-45.4). */
export const UpdatePoolMembersCanInviteSchema = z.object({
  poolId: z.string().uuid(),
  membersCanInvite: z.boolean(),
});

export type UpdatePoolMembersCanInviteInput = z.infer<typeof UpdatePoolMembersCanInviteSchema>;
