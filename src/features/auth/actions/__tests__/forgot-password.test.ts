import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { forgotPassword } from "../forgot-password";

function makeFormData(data: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

describe("forgotPassword", () => {
  const mockResetPassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({
      auth: { resetPasswordForEmail: mockResetPassword },
    } as never);
    mockResetPassword.mockResolvedValue({ error: null });
  });

  it("returns field error on invalid email", async () => {
    const result = await forgotPassword(makeFormData({ email: "not-an-email" }));
    expect(result?.error).toBeDefined();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it("returns success regardless of whether email exists (prevents enumeration)", async () => {
    const result = await forgotPassword(makeFormData({ email: "anyone@example.com" }));
    expect(result).toHaveProperty("success", true);
    expect(mockResetPassword).toHaveBeenCalled();
  });
});
