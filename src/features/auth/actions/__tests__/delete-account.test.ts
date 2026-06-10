import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth-logger", () => ({
  logAuthEvent: vi.fn(),
  redactEmail: vi.fn((e: string) => e),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { profile: { update: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount } from "../delete-account";

describe("deleteAccount", () => {
  const mockGetUser = vi.fn();
  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: mockGetUser, signOut: mockSignOut },
    } as never);
    mockSignOut.mockResolvedValue({ error: null });
  });

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await deleteAccount();
    expect(result?.error).toHaveProperty("_form");
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });

  it("soft-deletes profile and redirects on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "a@b.com" } } });
    vi.mocked(prisma.profile.update).mockResolvedValue({} as never);

    await deleteAccount();

    expect(prisma.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
    expect(mockSignOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/auth/sign-in?deleted=true");
  });
});
