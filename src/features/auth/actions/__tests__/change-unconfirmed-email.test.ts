import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  updateUserById: vi.fn(),
  adminResend: vi.fn(),
}));
const { signInWithPassword, signOut, updateUserById, adminResend } = mocks;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { signInWithPassword: mocks.signInWithPassword, signOut: mocks.signOut },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: { admin: { updateUserById: mocks.updateUserById }, resend: mocks.adminResend },
  })),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: vi.fn() } }));
vi.mock("@/lib/auth-logger", () => ({ logAuthEvent: vi.fn(), redactEmail: (e: string) => e }));
vi.mock("../../services/email-throttle", () => ({ consumeEmailActionCooldown: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { consumeEmailActionCooldown } from "../../services/email-throttle";
import { changeUnconfirmedEmail } from "../change-unconfirmed-email";

function makeFormData(data: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

const validInput = {
  currentEmail: "old@example.com",
  password: "secret123",
  newEmail: "new@example.com",
};

describe("changeUnconfirmedEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-test-key");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://test.app");
    vi.mocked(consumeEmailActionCooldown).mockResolvedValue({ allowed: true });
    updateUserById.mockResolvedValue({ error: null });
    adminResend.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks on cooldown", async () => {
    vi.mocked(consumeEmailActionCooldown).mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 30,
    });
    const result = await changeUnconfirmedEmail(makeFormData(validInput));
    expect(result.retryAfterSeconds).toBe(30);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("rejects invalid credentials", async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: "invalid_credentials", message: "Invalid login credentials" },
    });
    const result = await changeUnconfirmedEmail(makeFormData(validInput));
    expect(result.error?._form).toBeDefined();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("rejects an already-confirmed account", async () => {
    signInWithPassword.mockResolvedValue({ data: { session: { user: {} } }, error: null });
    const result = await changeUnconfirmedEmail(makeFormData(validInput));
    expect(result.error?._form).toBeDefined();
    expect(signOut).toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("updates email and resends confirmation for an unconfirmed account", async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: "email_not_confirmed", message: "Email not confirmed" },
    });
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: "user-1" }] as never);

    const result = await changeUnconfirmedEmail(makeFormData(validInput));
    expect(result.success).toBe(true);
    expect(updateUserById).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ email: "new@example.com", email_confirm: false }),
    );
    expect(adminResend).toHaveBeenCalledWith(expect.objectContaining({ type: "signup" }));
  });

  it("returns generic success when the user is not found (no enumeration)", async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: "email_not_confirmed", message: "Email not confirmed" },
    });
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);

    const result = await changeUnconfirmedEmail(makeFormData(validInput));
    expect(result.success).toBe(true);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("validates that the new email differs", async () => {
    const result = await changeUnconfirmedEmail(
      makeFormData({ ...validInput, newEmail: validInput.currentEmail }),
    );
    expect(result.error?.newEmail).toBeDefined();
  });
});
