import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { profile: { update: vi.fn(), findUnique: vi.fn() } },
}));
vi.mock("../../services/nickname", () => ({
  assignDiscriminator: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { assignDiscriminator } from "../../services/nickname";
import { setNickname } from "../set-nickname";

function makeFormData(data: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

describe("setNickname", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    } as never);
    // Default: no prior nickname change (onboarding case), so not rate-limited.
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({ nicknameUpdatedAt: null } as never);
  });

  it("returns error on invalid nickname", async () => {
    const result = await setNickname(makeFormData({ nicknameBase: "x" }));
    expect(result?.error).toBeDefined();
  });

  it("returns error when discriminator exhausted", async () => {
    vi.mocked(assignDiscriminator).mockResolvedValue(null);
    const result = await setNickname(makeFormData({ nicknameBase: "ValidNick" }));
    expect(result?.error).toContain("fully taken");
  });

  it("updates profile and returns success with full nickname", async () => {
    vi.mocked(assignDiscriminator).mockResolvedValue("0042");
    vi.mocked(prisma.profile.update).mockResolvedValue({} as never);

    const result = await setNickname(makeFormData({ nicknameBase: "ValidNick" }));
    expect(result).toEqual({ success: true, nickname: "ValidNick#0042" });
    expect(prisma.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          nicknameBase: "ValidNick",
          nicknameDiscriminator: "0042",
          nicknameUpdatedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("rate-limits a nickname change within the cooldown window", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      nicknameUpdatedAt: new Date(),
    } as never);
    const result = await setNickname(makeFormData({ nicknameBase: "ValidNick" }));
    expect(result?.error).toBe("rate_limited");
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });
});
