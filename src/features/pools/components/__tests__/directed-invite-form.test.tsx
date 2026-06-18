// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DirectedInviteForm } from "../directed-invite-form";

vi.mock("../../actions/create-directed-invite", () => ({
  createDirectedInvite: vi.fn().mockResolvedValue({ success: true, pushQueued: false }),
}));
vi.mock("../../actions/search-nicknames", () => ({
  searchNicknames: vi.fn().mockResolvedValue([]),
}));

import { createDirectedInvite } from "../../actions/create-directed-invite";
import { searchNicknames } from "../../actions/search-nicknames";

describe("DirectedInviteForm autocomplete (FR-REFINE-44.1–44.6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createDirectedInvite).mockResolvedValue({ success: true, pushQueued: false });
    vi.mocked(searchNicknames).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders input with placeholder", () => {
    render(<DirectedInviteForm poolId="11111111-1111-4111-8111-111111111111" />);
    expect(screen.getByTestId("directed-invite-input")).toBeDefined();
  });

  it("does NOT show dropdown when typing <2 chars", () => {
    render(<DirectedInviteForm poolId="11111111-1111-4111-8111-111111111111" />);
    const input = screen.getByTestId("directed-invite-input");
    fireEvent.change(input, { target: { value: "P" } });
    expect(screen.queryByTestId("directed-invite-dropdown")).toBeNull();
  });

  it("does NOT show dropdown when typing email (@)", () => {
    render(<DirectedInviteForm poolId="11111111-1111-4111-8111-111111111111" />);
    const input = screen.getByTestId("directed-invite-input");
    fireEvent.change(input, { target: { value: "pe@pe" } });
    expect(screen.queryByTestId("directed-invite-dropdown")).toBeNull();
  });

  it("shows dropdown with results when typing 2+ chars", async () => {
    vi.mocked(searchNicknames).mockResolvedValue([
      { userId: "u1", nicknameBase: "Pepe", nicknameDiscriminator: "1234", avatarUrl: null },
    ]);
    render(<DirectedInviteForm poolId="11111111-1111-4111-8111-111111111111" />);
    const input = screen.getByTestId("directed-invite-input");
    fireEvent.change(input, { target: { value: "Pe" } });

    await waitFor(
      () => {
        expect(screen.getByTestId("directed-invite-dropdown")).toBeDefined();
      },
      { timeout: 1000 },
    );
  });

  it("clicking a suggestion fills the input", async () => {
    vi.mocked(searchNicknames).mockResolvedValue([
      { userId: "u1", nicknameBase: "Pepe", nicknameDiscriminator: "1234", avatarUrl: null },
    ]);
    render(<DirectedInviteForm poolId="11111111-1111-4111-8111-111111111111" />);
    const input = screen.getByTestId("directed-invite-input");
    fireEvent.change(input, { target: { value: "Pe" } });

    await waitFor(
      () => {
        expect(screen.getByTestId("suggestion-0")).toBeDefined();
      },
      { timeout: 1000 },
    );

    fireEvent.mouseDown(screen.getByTestId("suggestion-0"));
    expect((input as HTMLInputElement).value).toBe("Pepe#1234");
  });

  it("Escape closes dropdown", async () => {
    vi.mocked(searchNicknames).mockResolvedValue([
      { userId: "u1", nicknameBase: "Pepe", nicknameDiscriminator: "1234", avatarUrl: null },
    ]);
    render(<DirectedInviteForm poolId="11111111-1111-4111-8111-111111111111" />);
    const input = screen.getByTestId("directed-invite-input");
    fireEvent.change(input, { target: { value: "Pe" } });

    await waitFor(
      () => {
        expect(screen.getByTestId("directed-invite-dropdown")).toBeDefined();
      },
      { timeout: 1000 },
    );

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByTestId("directed-invite-dropdown")).toBeNull();
  });

  it("submit button calls createDirectedInvite", async () => {
    vi.mocked(searchNicknames).mockResolvedValue([]);
    render(<DirectedInviteForm poolId="11111111-1111-4111-8111-111111111111" />);
    const input = screen.getByTestId("directed-invite-input");
    fireEvent.change(input, { target: { value: "Pedro#1234" } });

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(createDirectedInvite).toHaveBeenCalledWith(
        expect.objectContaining({ target: "Pedro#1234" }),
      );
    });
  });
});
