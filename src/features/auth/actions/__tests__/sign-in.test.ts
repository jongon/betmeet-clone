import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth-logger", () => ({
  logAuthEvent: vi.fn(),
  redactEmail: vi.fn((e: string) => e),
}));

import { createClient } from "@/lib/supabase/server";
import { signIn } from "../sign-in";

function makeFormData(data: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

describe("signIn", () => {
  const mockSignInWithPassword = vi.fn();
  const mockGetAuthenticatorAssuranceLevel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({ set: vi.fn(), delete: vi.fn() } as never);
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        mfa: { getAuthenticatorAssuranceLevel: mockGetAuthenticatorAssuranceLevel },
      },
    } as never);
    mockGetAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal1" },
    });
  });

  it("returns field errors on invalid input", async () => {
    const result = await signIn(makeFormData({ email: "bad", password: "" }));
    expect(result?.error).toBeDefined();
  });

  it("returns _form error on auth failure", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid credentials" },
    });
    const result = await signIn(makeFormData({ email: "a@b.com", password: "password123" }));
    expect(result?.error).toHaveProperty("_form");
  });

  it("returns requiresMfa when next level is aal2", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "1", email: "a@b.com" } },
      error: null,
    });
    mockGetAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
    });
    const result = await signIn(makeFormData({ email: "a@b.com", password: "password123" }));
    expect(result).toHaveProperty("requiresMfa", true);
  });

  it("redirects to /matches on success", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "1", email: "a@b.com" } },
      error: null,
    });
    await signIn(makeFormData({ email: "a@b.com", password: "password123" }));
    expect(redirect).toHaveBeenCalledWith("/matches");
  });
});
