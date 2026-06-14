import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { profile: { count: vi.fn() } },
}));

import { prisma } from "@/lib/prisma";
import { checkNicknameAvailability } from "../check-nickname-availability";

describe("checkNicknameAvailability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("checks nickname availability case-insensitively", async () => {
    vi.mocked(prisma.profile.count).mockResolvedValue(1);

    const result = await checkNicknameAvailability("Pepe");

    expect(result).toEqual({ available: true });
    expect(prisma.profile.count).toHaveBeenCalledWith({
      where: {
        nicknameBase: { equals: "Pepe", mode: "insensitive" },
        deletedAt: null,
      },
    });
  });
});
