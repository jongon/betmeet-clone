import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    competition: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}));

import { getCompetitionLockTime, isFrozen } from "../competition-lock";

describe("competition lock", () => {
  const original = process.env.WORLD_CUP_KICKOFF;

  afterEach(() => {
    process.env.WORLD_CUP_KICKOFF = original;
  });

  it("is not frozen when no lock time is configured", async () => {
    delete process.env.WORLD_CUP_KICKOFF;
    await expect(getCompetitionLockTime()).resolves.toBeNull();
    await expect(isFrozen(new Date("2026-06-11T00:00:00Z"))).resolves.toBe(false);
  });

  it("freezes at and after the configured kickoff", async () => {
    process.env.WORLD_CUP_KICKOFF = "2026-06-11T18:00:00Z";
    await expect(isFrozen(new Date("2026-06-11T17:59:59Z"))).resolves.toBe(false);
    await expect(isFrozen(new Date("2026-06-11T18:00:00Z"))).resolves.toBe(true);
  });
});
