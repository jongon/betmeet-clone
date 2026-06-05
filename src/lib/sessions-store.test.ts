import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  archiveSession,
  createSession,
  getAllSessions,
  getSessionById,
  rejectSession,
} from "@/lib/sessions-store";

let tmpDir = "";
let sessionsFile = "";
let sessionsSeedFile = "";

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "sessions-store-"));
  sessionsFile = path.join(tmpDir, "sessions.json");
  sessionsSeedFile = path.join(tmpDir, "sessions.seed.json");

  process.env.SESSIONS_FILE = sessionsFile;
  process.env.SESSIONS_SEED_FILE = sessionsSeedFile;

  await writeFile(sessionsSeedFile, "[]\n", "utf8");
});

afterEach(() => {
  delete process.env.SESSIONS_FILE;
  delete process.env.SESSIONS_SEED_FILE;
});

describe("sessions store archiving", () => {
  test("normalizes legacy sessions without archivedAt", async () => {
    await writeFile(
      sessionsFile,
      JSON.stringify(
        [
          {
            id: "ses_legacy",
            cambiadorName: "Carlos",
            offeredCount: 1,
            requestedCount: 1,
            createdAt: "2026-06-05T10:00:00.000Z",
            status: "closed",
            token: "qr_1234567890abcdef1234567890abcdef",
            proposal: null,
          },
        ],
        null,
        2,
      ),
      "utf8",
    );

    const sessions = await getAllSessions();
    assert.equal(sessions[0]?.archivedAt, null);
  });

  test("archives a closed session", async () => {
    const session = await createSession({
      token: "qr_1234567890abcdef1234567890abcdef",
      cambiadorId: "device-1",
      cambiadorName: "Marta",
    });

    await rejectSession(session.id);
    await archiveSession(session.id);

    const saved = await getSessionById(session.id);
    assert.equal(saved?.status, "closed");
    assert.ok(saved?.archivedAt);
  });

  test("does not archive an open session", async () => {
    const session = await createSession({
      token: "qr_1234567890abcdef1234567890abcdef",
      cambiadorId: "device-1",
      cambiadorName: "Luis",
    });

    await archiveSession(session.id);

    const saved = await getSessionById(session.id);
    assert.equal(saved?.status, "open");
    assert.equal(saved?.archivedAt, null);
  });
});
