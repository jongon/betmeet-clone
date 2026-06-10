import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pool: { findMany: vi.fn(), delete: vi.fn(), update: vi.fn() },
    poolMembership: { deleteMany: vi.fn() },
    $transaction: vi.fn(async (callback) =>
      callback({
        pool: { delete: vi.fn(), update: vi.fn() },
        poolMembership: { deleteMany: vi.fn() },
      }),
    ),
  },
}));
vi.mock("../session", () => ({
  formatNickname: (base: string | null, discriminator: string | null) =>
    base && discriminator ? `${base}#${discriminator}` : "Usuario",
}));

import { prisma } from "@/lib/prisma";
import {
  getOwnedPoolsNeedingTransfer,
  transferOwnedPoolsForAccountDeletion,
} from "../account-deletion";

describe("account-deletion pool ownership", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists transfer candidates oldest to newest", async () => {
    vi.mocked(prisma.pool.findMany).mockResolvedValue([
      {
        id: "pool-1",
        name: "Amigos",
        memberships: [
          { userId: "owner", user: { nicknameBase: "Owner", nicknameDiscriminator: "0001" } },
          { userId: "old", user: { nicknameBase: "Old", nicknameDiscriminator: "0002" } },
          { userId: "new", user: { nicknameBase: "New", nicknameDiscriminator: "0003" } },
        ],
      },
    ] as never);

    const result = await getOwnedPoolsNeedingTransfer("owner");

    expect(result[0]?.candidates.map((candidate) => candidate.userId)).toEqual(["old", "new"]);
  });

  it("requires an explicit assignment when other members exist", async () => {
    vi.mocked(prisma.pool.findMany).mockResolvedValue([
      {
        id: "pool-1",
        name: "Amigos",
        memberships: [
          { userId: "owner", user: { nicknameBase: "Owner", nicknameDiscriminator: "0001" } },
          { userId: "other", user: { nicknameBase: "Other", nicknameDiscriminator: "0002" } },
        ],
      },
    ] as never);

    const result = await transferOwnedPoolsForAccountDeletion("owner", []);

    expect(result.error).toContain("Elige un nuevo administrador");
  });
});
