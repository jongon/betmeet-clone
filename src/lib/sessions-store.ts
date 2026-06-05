import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { countOfferedItems, countRequestedRepeateds } from "@/lib/cambio-proposal";
import {
  type Session,
  type SessionProposal,
  SessionProposalSchema,
  SessionSchema,
  SessionsArraySchema,
} from "@/lib/sessions";

const DATA_DIR = path.join(process.cwd(), "data");

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

function getRuntimeFilePath(): string {
  return process.env.SESSIONS_FILE ?? path.join(DATA_DIR, "sessions.json");
}

function getSeedFilePath(): string {
  return process.env.SESSIONS_SEED_FILE ?? path.join(DATA_DIR, "sessions.seed.json");
}

async function ensureRuntimeFile(): Promise<void> {
  await mkdir(path.dirname(getRuntimeFilePath()), { recursive: true });
  try {
    await readFile(getRuntimeFilePath(), "utf8");
  } catch {
    await copyFile(getSeedFilePath(), getRuntimeFilePath());
  }
}

async function readSessions(): Promise<Session[]> {
  await ensureRuntimeFile();
  const raw = await readFile(getRuntimeFilePath(), "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return SessionsArraySchema.parse(parsed);
  }

  return parsed.map((session) => normalizeStoredSession(session));
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

function normalizeStoredSession(rawSession: unknown): Session {
  const parsed = SessionSchema.safeParse(rawSession);
  if (parsed.success) {
    return SessionSchema.parse({ ...parsed.data, archivedAt: parsed.data.archivedAt ?? null });
  }

  const base = rawSession as Omit<Session, "proposal"> & { proposal?: unknown };
  return SessionSchema.parse({
    ...base,
    archivedAt: base.archivedAt ?? null,
    proposal: normalizeStoredProposal(base.proposal),
  });
}

async function writeSessions(sessions: Session[]): Promise<void> {
  await ensureRuntimeFile();
  await writeFile(getRuntimeFilePath(), JSON.stringify(sessions, null, 2), "utf8");
}

function findSession(sessions: Session[], id: string): Session | undefined {
  return sessions.find((s) => s.id === id);
}

function isOpen(session: Session | undefined): session is Session {
  return session !== undefined && session.status === "open";
}

export async function getAllSessions(): Promise<Session[]> {
  return readSessions();
}

export async function getSessionById(id: string): Promise<Session | null> {
  const sessions = await readSessions();
  const found = sessions.find((session) => session.id === id);
  return found ? SessionSchema.parse(found) : null;
}

export async function acceptSession(id: string): Promise<void> {
  const sessions = await readSessions();
  const target = findSession(sessions, id);
  if (!isOpen(target)) return;
  const next = sessions.map((s) => (s.id === id ? { ...s, status: "closed" as const } : s));
  await writeSessions(next);
}

export async function rejectSession(id: string): Promise<void> {
  const sessions = await readSessions();
  const target = findSession(sessions, id);
  if (!isOpen(target)) return;
  const next = sessions.map((s) => (s.id === id ? { ...s, status: "closed" as const } : s));
  await writeSessions(next);
}

export async function archiveSession(id: string): Promise<void> {
  const sessions = await readSessions();
  const target = findSession(sessions, id);

  if (target?.status !== "closed" || target.archivedAt) {
    return;
  }

  const archivedAt = new Date().toISOString();
  const next = sessions.map((session) =>
    session.id === id ? { ...session, archivedAt } : session,
  );
  await writeSessions(next);
}

export async function findLatestSessionByTokenAndCambiadorId(
  token: string,
  cambiadorId: string,
): Promise<Session | null> {
  const sessions = await readSessions();
  const matches = sessions
    .filter((session) => session.token === token && session.cambiadorId === cambiadorId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return matches[0] ?? null;
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
  const sessions = await readSessions();
  const created: Session = {
    id: `ses_${randomUUID()}`,
    cambiadorName: input.cambiadorName,
    cambiadorId: input.cambiadorId,
    offeredCount: 0,
    requestedCount: 0,
    createdAt: new Date().toISOString(),
    status: "open",
    token: input.token,
    archivedAt: null,
    proposal: null,
  };
  await writeSessions([...sessions, created]);
  return created;
}

export async function saveSessionProposal(id: string, proposal: SessionProposal): Promise<Session> {
  const sessions = await readSessions();
  const target = findSession(sessions, id);

  if (!target) {
    throw new Error("Sesión no encontrada");
  }

  const nextSession = SessionSchema.parse({
    ...target,
    requestedCount: countRequestedRepeateds(proposal.requestedRepeateds),
    offeredCount: countOfferedItems(proposal.blocks),
    proposal,
  });

  await writeSessions(sessions.map((session) => (session.id === id ? nextSession : session)));
  return nextSession;
}
