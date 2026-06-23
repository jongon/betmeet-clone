// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/dictionary-provider", () => ({
  useDictionary: () => ({
    pools: {
      participants: "participantes",
      goToPool: "Ir a la liga",
      join: "Unirme",
      joining: "Uniendo…",
      full: "Lleno",
      alreadyMember: "Ya eres miembro de esta liga.",
    },
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("../../actions/join-public-pool", () => ({ joinPublicPool: vi.fn() }));

import { joinPublicPool } from "../../actions/join-public-pool";
import type { PoolPreviewItem } from "../../types";
import { PoolPreviewCard } from "../pool-preview-card";

const basePool: PoolPreviewItem = {
  id: "pool-1",
  name: "Liga Mundial",
  memberCount: 5,
  capacity: 100,
  isPublic: true,
  isMember: false,
};

describe("PoolPreviewCard — Unit 63 (FR-REFINE-63.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the 'Unirme' button when the user is NOT a member", () => {
    render(<PoolPreviewCard pool={{ ...basePool, isMember: false }} />);
    expect(screen.getByTestId("join-public-pool-pool-1")).toBeDefined();
    expect(screen.getByText("Unirme")).toBeDefined();
    expect(screen.queryByTestId("go-to-pool-pool-1")).toBeNull();
  });

  it("renders the 'Ir a la liga' button instead of 'Unirme' when already a member", () => {
    render(<PoolPreviewCard pool={{ ...basePool, isMember: true }} />);
    const goLink = screen.getByTestId("go-to-pool-pool-1");
    expect(goLink).toBeDefined();
    expect(goLink.getAttribute("href")).toBe("/pools/pool-1");
    expect(screen.getByText("Ir a la liga")).toBeDefined();
    expect(screen.queryByTestId("join-public-pool-pool-1")).toBeNull();
    expect(screen.queryByText("Unirme")).toBeNull();
  });

  it("does not invoke joinPublicPool when already a member (no join button)", () => {
    render(<PoolPreviewCard pool={{ ...basePool, isMember: true }} />);
    expect(joinPublicPool).not.toHaveBeenCalled();
  });

  it("renders 'Lleno' (disabled) for a full pool the user is NOT a member of", () => {
    render(
      <PoolPreviewCard pool={{ ...basePool, memberCount: 100, capacity: 100, isMember: false }} />,
    );
    const joinBtn = screen.getByTestId("join-public-pool-pool-1");
    expect(joinBtn.textContent).toBe("Lleno");
    expect(joinBtn.hasAttribute("disabled")).toBe(true);
  });
});
