import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { profile: { findUnique: vi.fn(), update: vi.fn() } },
}));
// revalidatePath needs a request scope; stub it for unit tests.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { setAvatarFromUpload } from "../set-avatar-from-upload";

describe("setAvatarFromUpload", () => {
  const mockRemove = vi.fn();
  const mockGetPublicUrl = vi.fn(() => ({
    data: { publicUrl: "https://storage.example.com/avatars/custom/user-1/avatar.png" },
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      storage: {
        from: vi.fn(() => ({ remove: mockRemove, getPublicUrl: mockGetPublicUrl })),
      },
    } as never);
    mockRemove.mockResolvedValue({ error: null });
  });

  it("returns error when path doesn't belong to current user", async () => {
    const result = await setAvatarFromUpload("custom/other-user/avatar.png");
    expect(result?.error).toBe("Invalid storage path");
  });

  it("updates profile with new avatar URL on success", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      avatarSource: "DEFAULT_SET",
      avatarUrl: null,
    } as never);
    vi.mocked(prisma.profile.update).mockResolvedValue({} as never);

    const result = await setAvatarFromUpload("custom/user-1/avatar.png");
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("avatarUrl");
    expect(prisma.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ avatarSource: "CUSTOM_UPLOAD" }) }),
    );
  });

  it("deletes old custom upload before setting new one", async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      avatarSource: "CUSTOM_UPLOAD",
      avatarUrl: "https://storage.example.com/object/public/avatars/custom/user-1/avatar.jpg",
    } as never);
    vi.mocked(prisma.profile.update).mockResolvedValue({} as never);

    await setAvatarFromUpload("custom/user-1/avatar.png");
    expect(mockRemove).toHaveBeenCalledWith(["custom/user-1/avatar.jpg"]);
  });
});
