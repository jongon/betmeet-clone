import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { profile: { findUnique: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { assignDiscriminator } from "../nickname";
import { generateNicknameSuggestions } from "../nickname-suggestions";

describe("generateNicknameSuggestions", () => {
  it("returns the requested number of unique suggestions", () => {
    const suggestions = generateNicknameSuggestions(5);
    expect(suggestions).toHaveLength(5);
    expect(new Set(suggestions).size).toBe(5);
  });

  it("each suggestion matches adjective+noun+digits pattern", () => {
    const suggestions = generateNicknameSuggestions(10);
    for (const s of suggestions) {
      expect(s).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{2}$/);
    }
  });
});

describe("assignDiscriminator", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a 4-digit zero-padded discriminator when slot is free", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);
    const result = await assignDiscriminator("CoolNick");
    expect(result).toMatch(/^\d{4}$/);
  });

  it("retries until a free slot is found", async () => {
    vi.mocked(prisma.profile.findUnique)
      .mockResolvedValueOnce({ id: "x" } as never)
      .mockResolvedValueOnce({ id: "x" } as never)
      .mockResolvedValue(null);

    const result = await assignDiscriminator("PopularNick");
    expect(result).toMatch(/^\d{4}$/);
    expect(prisma.profile.findUnique).toHaveBeenCalledTimes(3);
  });

  it("returns null after 10 exhausted retries", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({ id: "x" } as never);
    const result = await assignDiscriminator("FullNick");
    expect(result).toBeNull();
    expect(prisma.profile.findUnique).toHaveBeenCalledTimes(10);
  });
});
