import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSignedUploadUrl, getUser } = vi.hoisted(() => ({
  createSignedUploadUrl: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
    storage: { from: vi.fn(() => ({ createSignedUploadUrl })) },
  })),
}));

import { createAvatarUploadUrl } from "../create-avatar-upload-url";

describe("createAvatarUploadUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    createSignedUploadUrl.mockImplementation(async (path: string) => ({
      data: { signedUrl: `https://upload.example/${path}`, token: "token" },
      error: null,
    }));
  });

  it("creates a unique storage path for every upload attempt", async () => {
    const first = await createAvatarUploadUrl("image/png", 1024);
    const second = await createAvatarUploadUrl("image/png", 1024);

    expect(first.storagePath).toMatch(/^custom\/user-1\/[\da-f-]+\.png$/);
    expect(second.storagePath).toMatch(/^custom\/user-1\/[\da-f-]+\.png$/);
    expect(first.storagePath).not.toBe(second.storagePath);
    expect(createSignedUploadUrl).toHaveBeenCalledTimes(2);
  });

  it("returns a stable generic error when Supabase cannot sign the upload", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    createSignedUploadUrl.mockResolvedValueOnce({
      data: null,
      error: { message: "The resource already exists" },
    });

    const result = await createAvatarUploadUrl("image/jpeg", 1024);

    expect(result).toEqual({ error: "Failed to create upload URL" });
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to create avatar upload URL",
      expect.objectContaining({ message: "The resource already exists" }),
    );
    errorSpy.mockRestore();
  });
});
