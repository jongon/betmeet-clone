import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/pools/services/session", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { profile: { findUnique: vi.fn() } } }));

import { getCurrentUserId } from "@/features/pools/services/session";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "../require-admin";

describe("getAdminUserId (BR-7.1)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when unauthenticated", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);
    expect(await getAdminUserId()).toBeNull();
  });

  it("returns null for a non-admin profile", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("u1");
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      verificationStatus: "VERIFIED",
    } as never);
    expect(await getAdminUserId()).toBeNull();
  });

  it("returns the user id for an admin", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("admin1");
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      verificationStatus: "ADMIN",
    } as never);
    expect(await getAdminUserId()).toBe("admin1");
  });
});
