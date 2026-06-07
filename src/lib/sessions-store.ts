import { randomUUID } from "node:crypto";
import type { ProposalBlock, RequestedRepeated } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { countOfferedItems, countRequestedRepeateds } from "@/lib/cambio-proposal";
import { markStickersAsCompletedForAdmin, validateMissingStickersForProposal } from "@/lib/missing";
import { prisma } from "@/lib/prisma";
import { decrementRepeatedInventory, getInventory } from "@/lib/repeateds-store";
import {
  type Session,
  type SessionProposal,
  SessionProposalSchema,
  SessionSchema,
} from "@/lib/sessions";

type PrismaProposal = {
  id: number;
  sessionId: string;
  status: string;
  currentStep: number;
  flowVersion: number | null;
  selectedStickerCodes: unknown;
  updatedAt: Date;
  submittedAt: Date | null;
  blocks: ProposalBlock[];
  requestedRepeateds: RequestedRepeated[];
};

type PrismaSessionRow = {
  id: string;
  cambiadorName: string;
  cambiadorId: string | null;
  offeredCount: number;
  requestedCount: number;
  createdAt: Date;
  status: string;
  token: string;
  archivedAt: Date | null;
  proposal: PrismaProposal | null;
};

const proposalInclude = {
  include: {
    blocks: true,
    requestedRepeateds: true,
  },
} as const;

const sessionInclude = {
  include: {
    proposal: proposalInclude,
  },
} as const;

function normalizeStoredRuleLabel(label: unknown): unknown {
  if (label === "Regla general") {
    return "Intercambio general";
  }

  if (label === "Regla especial") {
    return "Intercambio especial";
  }

  return label;
}

function normalizeStoredModeLabel(mode: unknown): "Propone otra opcion" | "Acepta la regla" {
  return mode === "counteroffer" ? "Propone otra opcion" : "Acepta la regla";
}

function normalizeStoredCounteroffer(counteroffer: unknown): unknown {
  if (!counteroffer || typeof counteroffer !== "object") {
    return counteroffer;
  }

  const current = counteroffer as {
    quantity?: unknown;
    offerType?: unknown;
    offers?: unknown;
  } & Record<string, unknown>;

  if (current.offers) {
    return counteroffer;
  }

  const offerType = typeof current.offerType === "string" ? current.offerType : "PLAYER";
  const quantity = Math.max(0, Number(current.quantity ?? 0));

  return {
    ...current,
    offers: {
      PLAYER: offerType === "PLAYER" ? quantity : 0,
      BADGE: offerType === "BADGE" ? quantity : 0,
      TEAM_PHOTO: offerType === "TEAM_PHOTO" ? quantity : 0,
      SPECIAL: offerType === "SPECIAL" ? quantity : 0,
      ANY: offerType === "ANY" ? quantity : 0,
    },
  };
}

function normalizeStoredProposal(rawProposal: unknown): SessionProposal | null {
  if (!rawProposal) {
    return null;
  }

  const parsed = SessionProposalSchema.safeParse(rawProposal);
  if (parsed.success) {
    return parsed.data;
  }

  const base = rawProposal as {
    status?: unknown;
    currentStep?: unknown;
    flowVersion?: unknown;
    selectedStickerCodes?: unknown;
    blocks?: unknown;
    requestedRepeateds?: unknown;
    updatedAt?: unknown;
    submittedAt?: unknown;
  };

  const blocks = Array.isArray(base.blocks)
    ? base.blocks.map((block) => {
        const current = block as {
          mode?: unknown;
          modeLabel?: unknown;
          rule?: unknown;
        } & Record<string, unknown>;
        const rule = current.rule as { label?: unknown } & Record<string, unknown>;

        return {
          ...current,
          modeLabel: normalizeStoredModeLabel(current.mode),
          counteroffer: normalizeStoredCounteroffer(current.counteroffer),
          rule:
            rule && typeof rule === "object"
              ? {
                  ...rule,
                  label: normalizeStoredRuleLabel(rule.label),
                }
              : current.rule,
        };
      })
    : base.blocks;

  return SessionProposalSchema.parse({
    status: base.status,
    currentStep: Math.min(Number(base.currentStep ?? 1), 3),
    flowVersion: base.flowVersion,
    selectedStickerCodes: base.selectedStickerCodes,
    blocks,
    requestedRepeateds: base.requestedRepeateds ?? [],
    updatedAt: base.updatedAt,
    submittedAt: base.submittedAt,
  });
}

function toProposal(row: PrismaProposal): SessionProposal {
  const raw = {
    status: row.status,
    currentStep: row.currentStep,
    flowVersion: row.flowVersion ?? undefined,
    selectedStickerCodes: row.selectedStickerCodes,
    blocks: row.blocks.map((b) => ({
      ...b,
      modeLabel: normalizeStoredModeLabel(b.mode),
      counteroffer: normalizeStoredCounteroffer(b.counteroffer),
      rule:
        b.rule && typeof b.rule === "object"
          ? {
              ...(b.rule as Record<string, unknown>),
              label: normalizeStoredRuleLabel((b.rule as Record<string, unknown>).label),
            }
          : b.rule,
    })),
    requestedRepeateds: row.requestedRepeateds.map((r) => ({
      stickerCode: r.stickerCode,
      quantity: r.quantity,
    })),
    updatedAt: row.updatedAt.toISOString(),
    submittedAt: row.submittedAt?.toISOString() ?? null,
  };

  return normalizeStoredProposal(raw) ?? SessionProposalSchema.parse(raw);
}

function toSession(row: PrismaSessionRow): Session {
  return SessionSchema.parse({
    id: row.id,
    cambiadorName: row.cambiadorName,
    cambiadorId: row.cambiadorId ?? undefined,
    offeredCount: row.offeredCount,
    requestedCount: row.requestedCount,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    token: row.token,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    proposal: row.proposal ? toProposal(row.proposal) : undefined,
  });
}

export async function getAllSessions(): Promise<Session[]> {
  const rows = await prisma.session.findMany({
    ...sessionInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toSession);
}

export async function getSessionById(id: string): Promise<Session | null> {
  const row = await prisma.session.findUnique({
    where: { id },
    ...sessionInclude,
  });
  return row ? toSession(row) : null;
}

export async function acceptSession(id: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id, status: "open" },
    data: { status: "closed" },
  });
}

export async function acceptPendingSessionForAdmin(id: string, ownerEmail: string): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id },
    ...sessionInclude,
  });

  if (!session || session.status !== "open") return;

  const domainProposal = toProposal(session.proposal!);
  if (domainProposal.status !== "pending") return;

  const requestedStickerCodes = domainProposal.blocks.map((block) => block.requestedStickerCode);
  const missingValidation = await validateMissingStickersForProposal(
    ownerEmail,
    requestedStickerCodes,
  );

  if (missingValidation.status !== "pending") {
    await prisma.session.update({ where: { id }, data: { status: "closed" } });
    return;
  }

  const repeatedInventory = await getInventory(ownerEmail);
  const hasEnoughRepeateds = domainProposal.requestedRepeateds.every(
    (item) => (repeatedInventory.items[item.stickerCode] ?? 0) >= item.quantity,
  );

  if (!hasEnoughRepeateds) {
    await prisma.session.update({ where: { id }, data: { status: "closed" } });
    return;
  }

  const decremented = await decrementRepeatedInventory(
    ownerEmail,
    domainProposal.requestedRepeateds,
  );
  if (!decremented.ok) {
    await prisma.session.update({ where: { id }, data: { status: "closed" } });
    return;
  }

  await markStickersAsCompletedForAdmin(ownerEmail, requestedStickerCodes);

  await prisma.session.update({ where: { id }, data: { status: "closed" } });
}

export async function rejectSession(id: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id, status: "open" },
    data: { status: "closed" },
  });
}

export async function archiveSession(id: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id, status: "closed", archivedAt: null },
    data: { archivedAt: new Date() },
  });
}

export async function findLatestSessionByTokenAndCambiadorId(
  token: string,
  cambiadorId: string,
): Promise<Session | null> {
  const row = await prisma.session.findFirst({
    where: { token, cambiadorId },
    ...sessionInclude,
    orderBy: { createdAt: "desc" },
  });
  return row ? toSession(row) : null;
}

type CreateSessionInput = {
  token: string;
  cambiadorId: string;
  cambiadorName: string;
};

export type CreadorSessionResolution =
  | { kind: "none" }
  | { kind: "open"; session: Session }
  | { kind: "closed"; session: Session };

export async function resolveByTokenAndCambiadorId(
  token: string,
  cambiadorId: string,
): Promise<CreadorSessionResolution> {
  const latest = await findLatestSessionByTokenAndCambiadorId(token, cambiadorId);
  if (!latest) return { kind: "none" };
  if (latest.status === "closed") return { kind: "closed", session: latest };
  return { kind: "open", session: latest };
}

export async function createSession(input: CreateSessionInput): Promise<Session> {
  const row = await prisma.session.create({
    data: {
      id: `ses_${randomUUID()}`,
      cambiadorName: input.cambiadorName,
      cambiadorId: input.cambiadorId,
      offeredCount: 0,
      requestedCount: 0,
      createdAt: new Date(),
      status: "open",
      token: input.token,
    },
  });

  return SessionSchema.parse({
    id: row.id,
    cambiadorName: row.cambiadorName,
    cambiadorId: row.cambiadorId,
    offeredCount: row.offeredCount,
    requestedCount: row.requestedCount,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    token: row.token,
    archivedAt: null,
    proposal: null,
  });
}

export async function saveSessionProposal(id: string, proposal: SessionProposal): Promise<Session> {
  const session = await prisma.session.findUnique({ where: { id } });

  if (!session) {
    throw new Error("Sesión no encontrada");
  }

  await prisma.sessionProposal.deleteMany({ where: { sessionId: id } });

  await prisma.sessionProposal.create({
    data: {
      session: { connect: { id } },
      status: proposal.status,
      currentStep: proposal.currentStep,
      flowVersion: proposal.flowVersion,
      selectedStickerCodes: proposal.selectedStickerCodes,
      updatedAt: new Date(),
      submittedAt: proposal.submittedAt ? new Date(proposal.submittedAt) : null,
      blocks: {
        create: proposal.blocks.map((block) => ({
          requestedStickerCode: block.requestedStickerCode,
          requestedStickerLabel: block.requestedStickerLabel,
          requestedStickerType: block.requestedStickerType,
          mode: block.mode,
          modeLabel: block.modeLabel,
          rule: block.rule,
          fulfillRequirements: block.fulfillRequirements,
          counteroffer: block.counteroffer ?? Prisma.JsonNull,
        })),
      },
      requestedRepeateds: {
        create: proposal.requestedRepeateds.map((item) => ({
          stickerCode: item.stickerCode,
          quantity: item.quantity,
        })),
      },
    },
  });

  await prisma.session.update({
    where: { id },
    data: {
      requestedCount: countRequestedRepeateds(proposal.requestedRepeateds),
      offeredCount: countOfferedItems(proposal.blocks),
    },
  });

  const updated = await prisma.session.findUnique({
    where: { id },
    ...sessionInclude,
  });

  return toSession(updated!);
}
