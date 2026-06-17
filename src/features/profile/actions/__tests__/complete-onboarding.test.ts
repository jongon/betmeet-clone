import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { profile: { updateMany: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "../complete-onboarding";

describe("completeOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
        refreshSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    } as never);
    vi.mocked(prisma.profile.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  it("marks the authenticated profile as onboarded", async () => {
    const result = await completeOnboarding();

    expect(result).toEqual({ success: true });
    expect(prisma.profile.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { onboardingCompleted: true },
    });
  });

  it("returns an error when unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);

    const result = await completeOnboarding();

    expect(result).toEqual({ error: "Not authenticated" });
    expect(prisma.profile.updateMany).not.toHaveBeenCalled();
  });

  it("returns an error when the profile is missing", async () => {
    vi.mocked(prisma.profile.updateMany).mockResolvedValue({ count: 0 } as never);

    const result = await completeOnboarding();

    expect(result).toEqual({ error: "Profile not found" });
  });
});
