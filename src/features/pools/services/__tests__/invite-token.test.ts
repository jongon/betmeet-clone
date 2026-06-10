import { describe, expect, it, vi } from "vitest";
import { generateInviteToken, generateUniqueInviteToken } from "../invite-token";

describe("invite token", () => {
  it("uses an 8-character unambiguous token format", () => {
    expect(generateInviteToken()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  });

  it("retries until a unique token is found", async () => {
    const exists = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const token = await generateUniqueInviteToken(exists);
    expect(token).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    expect(exists).toHaveBeenCalledTimes(2);
  });
});
