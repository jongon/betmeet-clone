// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AvatarAsset } from "../types";

// Cut the server-action import chain (next/headers, supabase server client, prisma).
const { setAvatarFromDefaultSet } = vi.hoisted(() => ({
  setAvatarFromDefaultSet: vi.fn(),
}));
vi.mock("../actions/set-avatar-from-default-set", () => ({ setAvatarFromDefaultSet }));
vi.mock("../actions/set-avatar-from-google", () => ({ setAvatarFromGoogle: vi.fn() }));
vi.mock("../actions/set-avatar-from-upload", () => ({ setAvatarFromUpload: vi.fn() }));
vi.mock("../actions/create-avatar-upload-url", () => ({ createAvatarUploadUrl: vi.fn() }));

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { AvatarSourceTabs } from "../components/avatar-source-tabs";

const avatars: AvatarAsset[] = [
  {
    id: "a1",
    name: "Balón",
    storagePath: "d/1.svg",
    storageUrl: "https://x/1.svg",
    displayOrder: 1,
  },
  {
    id: "a2",
    name: "Trofeo",
    storagePath: "d/2.svg",
    storageUrl: "https://x/2.svg",
    displayOrder: 2,
  },
];

afterEach(() => {
  cleanup();
  setAvatarFromDefaultSet.mockReset();
  refresh.mockReset();
});

describe("AvatarSourceTabs default selection", () => {
  it("persists the choice and refreshes the route so the new avatar shows", async () => {
    setAvatarFromDefaultSet.mockResolvedValue({ success: true, avatarUrl: "https://x/2.svg" });
    render(<AvatarSourceTabs defaultAvatars={avatars} currentAvatarUrl="" />);

    fireEvent.click(screen.getByRole("option", { name: "Trofeo" }));

    await waitFor(() => expect(setAvatarFromDefaultSet).toHaveBeenCalledWith("a2"));
    // Without router.refresh() the preview/header never update → "only selects".
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("does not refresh when the action reports failure", async () => {
    setAvatarFromDefaultSet.mockResolvedValue({ error: "Avatar not found" });
    render(<AvatarSourceTabs defaultAvatars={avatars} currentAvatarUrl="" />);

    fireEvent.click(screen.getByRole("option", { name: "Balón" }));

    await waitFor(() => expect(setAvatarFromDefaultSet).toHaveBeenCalledWith("a1"));
    expect(refresh).not.toHaveBeenCalled();
  });
});
