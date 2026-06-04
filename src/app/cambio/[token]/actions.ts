"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getOrCreateCambiadorId } from "@/lib/cambiador-identity";
import { buildCambioEntryState } from "@/lib/cambio-entry";
import { getToken } from "@/lib/qr-store";
import { createSession, resolveByTokenAndCambiadorId } from "@/lib/sessions-store";

const TokenSchema = z.string().regex(/^qr_[0-9a-f]{32}$/, "Token inválido");
const NameSchema = z
  .string()
  .trim()
  .min(2, "Tu nombre debe tener al menos 2 caracteres")
  .max(40, "Tu nombre debe tener máximo 40 caracteres");

type CreateCambioSessionState = {
  error: string | null;
  fieldError: string | null;
  value: string;
};

export async function createCambioSessionAction(
  _prev: CreateCambioSessionState,
  formData: FormData,
): Promise<CreateCambioSessionState> {
  const cookieStore = await cookies();
  const cambiadorId = getOrCreateCambiadorId(cookieStore);

  const rawToken = formData.get("token");
  const rawName = formData.get("name");
  const value = typeof rawName === "string" ? rawName : "";

  const tokenParsed = TokenSchema.safeParse(rawToken);
  if (!tokenParsed.success) {
    return { error: "El QR no es válido.", fieldError: null, value };
  }

  const nameParsed = NameSchema.safeParse(rawName);
  if (!nameParsed.success) {
    return {
      error: null,
      fieldError: nameParsed.error.issues[0]?.message ?? "Nombre inválido",
      value,
    };
  }

  const token = await getToken(tokenParsed.data);
  const entryState = buildCambioEntryState({
    token: tokenParsed.data,
    hasActiveToken: Boolean(token && token.revokedAt === null),
    sessionResolution: await resolveByTokenAndCambiadorId(tokenParsed.data, cambiadorId),
  });

  if (entryState.kind === "invalid-token") {
    return { error: "El QR no es válido.", fieldError: null, value: nameParsed.data };
  }

  if (entryState.kind === "revoked-token") {
    return {
      error: "Este QR ya no está disponible. Pide al coleccionista un QR vigente.",
      fieldError: null,
      value: nameParsed.data,
    };
  }

  if (entryState.kind === "closed-session") {
    return {
      error:
        "Ya existe una sesión cerrada para este QR en este dispositivo. Pide un QR nuevo para continuar.",
      fieldError: null,
      value: nameParsed.data,
    };
  }

  if (entryState.kind === "resume") {
    redirect(`/cambio/${tokenParsed.data}?session=${entryState.sessionId}`);
  }

  const created = await createSession({
    token: tokenParsed.data,
    cambiadorId,
    cambiadorName: nameParsed.data,
  });

  redirect(`/cambio/${tokenParsed.data}?session=${created.id}`);
}
