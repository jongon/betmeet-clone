import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { changePassword } from "../change-password";

function makeFormData(data: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

describe("changePassword", () => {
  const mockGetUser = vi.fn();
  const mockSignIn = vi.fn();
  const mockUpdateUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: mockGetUser,
        signInWithPassword: mockSignIn,
        updateUser: mockUpdateUser,
      },
    } as never);
  });

  it("returns field errors on schema violation", async () => {
    const result = await changePassword(
      makeFormData({ currentPassword: "", newPassword: "short", confirmNewPassword: "mismatch" }),
    );
    expect(result?.error).toBeDefined();
  });

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await changePassword(
      makeFormData({
        currentPassword: "old",
        newPassword: "newpass123",
        confirmNewPassword: "newpass123",
      }),
    );
    expect(result?.error).toHaveProperty("_form");
  });

  it("returns error when current password is wrong", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    mockSignIn.mockResolvedValue({ error: { message: "Invalid" } });
    const result = await changePassword(
      makeFormData({
        currentPassword: "wrong",
        newPassword: "newpass123",
        confirmNewPassword: "newpass123",
      }),
    );
    expect(result?.error).toHaveProperty("currentPassword");
  });

  it("returns success on valid password change", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    mockSignIn.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({ error: null });
    const result = await changePassword(
      makeFormData({
        currentPassword: "correct",
        newPassword: "newpass123",
        confirmNewPassword: "newpass123",
      }),
    );
    expect(result).toHaveProperty("success", true);
  });
});
