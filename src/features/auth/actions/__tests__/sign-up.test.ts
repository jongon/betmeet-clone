import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { signUp } from "../sign-up";

function makeFormData(data: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

describe("signUp", () => {
  const mockSignUp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({
      auth: { signUp: mockSignUp },
    } as never);
  });

  it("returns field errors on invalid input", async () => {
    const result = await signUp(
      makeFormData({ email: "bad", password: "short", confirmPassword: "short" }),
    );
    expect(result?.error).toBeDefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns field error when passwords don't match", async () => {
    const result = await signUp(
      makeFormData({ email: "a@b.com", password: "password123", confirmPassword: "different" }),
    );
    expect(result?.error).toHaveProperty("confirmPassword");
  });

  it("redirects to verify-email on success", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    await signUp(
      makeFormData({ email: "a@b.com", password: "password123", confirmPassword: "password123" }),
    );
    expect(redirect).toHaveBeenCalledWith("/verify-email");
  });

  it("carries the invite destination via encoded user_metadata", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    await signUp(
      makeFormData({
        email: "a@b.com",
        password: "password123",
        confirmPassword: "password123",
        next: "/pools/join/ABC123",
      }),
    );
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: { invite_next: encodeURIComponent("/pools/join/ABC123") },
        }),
      }),
    );
  });

  it("defaults invite_next to /matches when no destination is given", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    await signUp(
      makeFormData({ email: "a@b.com", password: "password123", confirmPassword: "password123" }),
    );
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: { invite_next: encodeURIComponent("/matches") },
        }),
      }),
    );
  });

  it("returns _form error on supabase error", async () => {
    mockSignUp.mockResolvedValue({ error: { message: "Email already registered" } });
    const result = await signUp(
      makeFormData({ email: "a@b.com", password: "password123", confirmPassword: "password123" }),
    );
    expect(result?.error).toHaveProperty("_form");
  });
});
