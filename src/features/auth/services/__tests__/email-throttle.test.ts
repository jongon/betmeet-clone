import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailActionThrottle: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { consumeEmailActionCooldown } from "../email-throttle";

describe("consumeEmailActionCooldown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.emailActionThrottle.upsert).mockResolvedValue({} as never);
  });

  it("allows when no prior record and records the send", async () => {
    vi.mocked(prisma.emailActionThrottle.findUnique).mockResolvedValue(null as never);
    const result = await consumeEmailActionCooldown("USER@Example.com", "resend_confirmation");
    expect(result).toEqual({ allowed: true });
    // Email is normalized to lowercase for the throttle key.
    expect(prisma.emailActionThrottle.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email_action: { email: "user@example.com", action: "resend_confirmation" } },
      }),
    );
  });

  it("blocks within the cooldown window and reports retryAfter", async () => {
    vi.mocked(prisma.emailActionThrottle.findUnique).mockResolvedValue({
      lastSentAt: new Date(Date.now() - 10_000),
    } as never);
    const result = await consumeEmailActionCooldown("user@example.com", "resend_confirmation", 60);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(prisma.emailActionThrottle.upsert).not.toHaveBeenCalled();
  });

  it("allows again once the cooldown has elapsed", async () => {
    vi.mocked(prisma.emailActionThrottle.findUnique).mockResolvedValue({
      lastSentAt: new Date(Date.now() - 120_000),
    } as never);
    const result = await consumeEmailActionCooldown("user@example.com", "resend_confirmation", 60);
    expect(result).toEqual({ allowed: true });
    expect(prisma.emailActionThrottle.upsert).toHaveBeenCalled();
  });
});
