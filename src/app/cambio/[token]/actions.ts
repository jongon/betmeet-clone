"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getCambiadorId,
  getOrCreateCambiadorId,
  setCambioSessionId,
} from "@/lib/cambiador-identity";
import { buildCambioEntryState } from "@/lib/cambio-entry";
import { normalizeProposalDraft, normalizeRequestedRepeateds } from "@/lib/cambio-proposal";
import { getExchangeSettings } from "@/lib/exchange-settings-store";
import { validateMissingStickersForProposal } from "@/lib/missing";
import { QrTokenStringSchema } from "@/lib/qr";
import { getToken } from "@/lib/qr-store";
import { getInventory } from "@/lib/repeateds-store";
import { type Session, type SessionProposal, SessionProposalSchema } from "@/lib/sessions";
import {
  createSession,
  resolveByTokenAndCambiadorId,
  saveSessionProposal,
} from "@/lib/sessions-store";

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

const SaveProposalInputSchema = z.object({
  token: QrTokenStringSchema,
  sessionId: z.string().min(1),
  proposal: SessionProposalSchema,
});

async function resolveOpenSessionForAction(token: string, sessionId: string): Promise<Session> {
  const cookieStore = await cookies();
  const cambiadorId = getCambiadorId(cookieStore);

  if (!cambiadorId) {
    throw new Error("No se pudo validar la sesión del cambiador.");
  }

  const resolution = await resolveByTokenAndCambiadorId(token, cambiadorId);
  if (resolution.kind !== "open" || resolution.session.id !== sessionId) {
    throw new Error("La sesión ya no está disponible.");
  }

  return resolution.session;
}

export async function createCambioSessionAction(
  _prev: CreateCambioSessionState,
  formData: FormData,
): Promise<CreateCambioSessionState> {
  const cookieStore = await cookies();
  const cambiadorId = getOrCreateCambiadorId(cookieStore);

  const rawToken = formData.get("token");
  const rawName = formData.get("name");
  const value = typeof rawName === "string" ? rawName : "";

  const tokenParsed = QrTokenStringSchema.safeParse(rawToken);
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
    setCambioSessionId(cookieStore, tokenParsed.data, entryState.sessionId);
    redirect(`/cambio/${tokenParsed.data}?session=${entryState.sessionId}`);
  }

  const created = await createSession({
    token: tokenParsed.data,
    cambiadorId,
    cambiadorName: nameParsed.data,
  });

  setCambioSessionId(cookieStore, tokenParsed.data, created.id);

  redirect(`/cambio/${tokenParsed.data}?session=${created.id}`);
}

export async function saveCambioProposalDraftAction(input: unknown): Promise<SessionProposal> {
  const parsed = SaveProposalInputSchema.parse(input);
  await resolveOpenSessionForAction(parsed.token, parsed.sessionId);
  const qrToken = await getToken(parsed.token);

  if (!qrToken || qrToken.revokedAt !== null) {
    throw new Error("Este QR ya no está disponible.");
  }

  const settings = await getExchangeSettings(qrToken.ownerEmail);
  const repeatedInventory = await getInventory(qrToken.ownerEmail);
  const proposal = normalizeProposalDraft(parsed.proposal, settings.global, settings.overrides);
  const saved = await saveSessionProposal(parsed.sessionId, {
    ...proposal,
    requestedRepeateds: normalizeRequestedRepeateds(
      proposal.requestedRepeateds,
      repeatedInventory.items,
    ),
    status: "draft",
    submittedAt: null,
    updatedAt: new Date().toISOString(),
  });

  revalidatePath(`/cambio/${parsed.token}`);
  if (!saved.proposal) {
    throw new Error("No se pudo guardar el borrador.");
  }

  return saved.proposal;
}

export async function submitCambioProposalAction(input: unknown): Promise<SessionProposal> {
  const parsed = SaveProposalInputSchema.parse(input);
  const session = await resolveOpenSessionForAction(parsed.token, parsed.sessionId);
  const qrToken = await getToken(parsed.token);

  if (!qrToken || qrToken.revokedAt !== null) {
    throw new Error("Este QR ya no está disponible.");
  }

  const settings = await getExchangeSettings(qrToken.ownerEmail);
  const repeatedInventory = await getInventory(qrToken.ownerEmail);
  const proposal = normalizeProposalDraft(parsed.proposal, settings.global, settings.overrides);
  const validation = await validateMissingStickersForProposal(
    qrToken.ownerEmail,
    proposal.selectedStickerCodes,
  );

  if (validation.status !== "pending") {
    throw new Error(validation.reason);
  }

  const saved = await saveSessionProposal(session.id, {
    ...proposal,
    requestedRepeateds: normalizeRequestedRepeateds(
      proposal.requestedRepeateds,
      repeatedInventory.items,
    ),
    status: "pending",
    currentStep: 3,
    updatedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
  });

  revalidatePath(`/cambio/${parsed.token}`);
  if (!saved.proposal) {
    throw new Error("No se pudo enviar la propuesta.");
  }

  return saved.proposal;
}
