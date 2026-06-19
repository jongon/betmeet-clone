import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth-logger", () => ({
  logAuthEvent: vi.fn(),
  redactEmail: vi.fn((e: string) => e),
}));
vi.mock("@/features/pools/services/account-deletion", () => ({
  transferOwnedPoolsForAccountDeletion: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { profile: { update: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount } from "../delete-account";

describe("deleteAccount", () => {
  const mockGetUser = vi.fn();
  const mockSignOut = vi.fn();
  const mockDeleteUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: mockGetUser, signOut: mockSignOut },
    } as never);
    vi.mocked(createAdminClient).mockReturnValue({
      auth: { admin: { deleteUser: mockDeleteUser } },
    } as never);
    mockSignOut.mockResolvedValue({ error: null });
    mockDeleteUser.mockResolvedValue({ error: null });
  });

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await deleteAccount();
    expect(result?.error).toHaveProperty("_form");
    expect(prisma.profile.update).not.toHaveBeenCalled();
  });

  it("soft-deletes the profile, hard-deletes the auth user and redirects on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "a@b.com" } } });
    vi.mocked(prisma.profile.update).mockResolvedValue({} as never);

    await deleteAccount();

    expect(prisma.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          // Nickname released so the unique combination can be reused.
          nicknameBase: null,
          nicknameDiscriminator: null,
        }),
      }),
    );
    // WF-11 step 2 / RULE-SEC-03: the auth.users record is hard-deleted.
    expect(mockDeleteUser).toHaveBeenCalledWith("user-1");
    expect(mockSignOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/sign-in?deleted=true");
  });

  it("returns an error and does not redirect when the auth purge fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "a@b.com" } } });
    vi.mocked(prisma.profile.update).mockResolvedValue({} as never);
    mockDeleteUser.mockResolvedValue({ error: { message: "boom" } });

    const result = await deleteAccount();

    expect(result?.error).toHaveProperty("_form");
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
