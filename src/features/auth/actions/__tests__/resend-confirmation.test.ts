import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth-logger", () => ({ logAuthEvent: vi.fn(), redactEmail: (e: string) => e }));
vi.mock("../../services/email-throttle", () => ({ consumeEmailActionCooldown: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { consumeEmailActionCooldown } from "../../services/email-throttle";
import { resendConfirmation } from "../resend-confirmation";

function makeFormData(data: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

describe("resendConfirmation", () => {
  const resend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({ auth: { resend } } as never);
  });

  it("returns retryAfterSeconds when throttled and does not call resend", async () => {
    vi.mocked(consumeEmailActionCooldown).mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 42,
    });
    const result = await resendConfirmation(makeFormData({ email: "u@example.com" }));
    expect(result.retryAfterSeconds).toBe(42);
    expect(resend).not.toHaveBeenCalled();
  });

  it("resends and returns success when allowed", async () => {
    vi.mocked(consumeEmailActionCooldown).mockResolvedValue({ allowed: true });
    resend.mockResolvedValue({ error: null });
    const result = await resendConfirmation(makeFormData({ email: "u@example.com" }));
    expect(result.success).toBe(true);
    expect(resend).toHaveBeenCalledWith(expect.objectContaining({ type: "signup" }));
  });

  it("returns generic success even when Supabase errors (no enumeration)", async () => {
    vi.mocked(consumeEmailActionCooldown).mockResolvedValue({ allowed: true });
    resend.mockResolvedValue({ error: { message: "User already confirmed" } });
    const result = await resendConfirmation(makeFormData({ email: "u@example.com" }));
    expect(result.success).toBe(true);
  });

  it("validates the email", async () => {
    const result = await resendConfirmation(makeFormData({ email: "not-an-email" }));
    expect(result.error?.email).toBeDefined();
  });
});
