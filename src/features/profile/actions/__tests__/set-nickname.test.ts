import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { profile: { update: vi.fn(), findUnique: vi.fn() } },
}));
vi.mock("../../services/nickname", () => ({
  assignDiscriminator: vi.fn(),
}));

import { revalidatePath } from "next/cache";
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
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      nicknameBase: null,
      nicknameUpdatedAt: null,
      nicknameChangeCount: 0,
      onboardingCompleted: false,
    } as never);
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
          nicknameChangeCount: 1,
        }),
      }),
    );
    expect(vi.mocked(prisma.profile.update).mock.calls[0]?.[0].data).not.toHaveProperty(
      "onboardingCompleted",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/settings/profile");
  });

  it("allows the first post-onboarding nickname change as the grace opportunity", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      nicknameBase: "OldNick",
      nicknameUpdatedAt: new Date(),
      nicknameChangeCount: 1,
      onboardingCompleted: true,
    } as never);
    vi.mocked(assignDiscriminator).mockResolvedValue("0042");
    vi.mocked(prisma.profile.update).mockResolvedValue({} as never);

    const result = await setNickname(makeFormData({ nicknameBase: "ValidNick" }));
    expect(result).toEqual({ success: true, nickname: "ValidNick#0042" });
    expect(prisma.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nicknameChangeCount: 2 }),
      }),
    );
  });

  it("rate-limits a nickname change after the grace opportunity within the cooldown window", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      nicknameBase: "OldNick",
      nicknameUpdatedAt: new Date(),
      nicknameChangeCount: 2,
      onboardingCompleted: true,
    } as never);
    const result = await setNickname(makeFormData({ nicknameBase: "ValidNick" }));
    expect(result?.error).toBe("rate_limited");
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });

  it("does NOT rate-limit during onboarding even with a recent timestamp (FR-REFINE-16.5)", async () => {
    // Re-submitting after pressing "Atrás" mid-onboarding: cooldown must not apply.
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      nicknameBase: "ValidNick",
      nicknameUpdatedAt: new Date(),
      nicknameChangeCount: 1,
      onboardingCompleted: false,
    } as never);
    vi.mocked(assignDiscriminator).mockResolvedValue("0042");
    vi.mocked(prisma.profile.update).mockResolvedValue({} as never);

    const result = await setNickname(makeFormData({ nicknameBase: "ValidNick" }));
    expect(result).toEqual({ success: true, nickname: "ValidNick#0042" });
    expect(prisma.profile.update).toHaveBeenCalled();
  });

  it("does NOT rate-limit the first nickname assignment even after onboarding", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      nicknameBase: null,
      nicknameUpdatedAt: new Date(),
      nicknameChangeCount: 0,
      onboardingCompleted: true,
    } as never);
    vi.mocked(assignDiscriminator).mockResolvedValue("0042");
    vi.mocked(prisma.profile.update).mockResolvedValue({} as never);

    const result = await setNickname(makeFormData({ nicknameBase: "ValidNick" }));
    expect(result).toEqual({ success: true, nickname: "ValidNick#0042" });
    expect(prisma.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nicknameChangeCount: 1 }),
      }),
    );
  });
});
