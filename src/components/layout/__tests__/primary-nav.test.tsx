// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let mockPathname = "/matches";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { AdminContextBadge, isActive, PrimaryNav } from "../primary-nav";

afterEach(cleanup);

describe("isActive", () => {
  it("matches exact and nested routes", () => {
    expect(isActive("/pools", "/pools")).toBe(true);
    expect(isActive("/pools/new", "/pools")).toBe(true);
    expect(isActive("/matches", "/pools")).toBe(false);
    // Guards against prefix false-positives like /poolsX.
    expect(isActive("/poolsX", "/pools")).toBe(false);
  });
});

describe("PrimaryNav", () => {
  it("marks the active section with aria-current", () => {
    mockPathname = "/pools";
    render(<PrimaryNav />);
    const active = screen.getAllByRole("link", { name: "Ligas" })[0];
    expect(active).toHaveAttribute("aria-current", "page");
    const inactive = screen.getAllByRole("link", { name: "Partidos" })[0];
    expect(inactive).not.toHaveAttribute("aria-current");
  });
});

describe("AdminContextBadge", () => {
  it("renders only inside /admin", () => {
    mockPathname = "/admin/matches";
    const { rerender } = render(<AdminContextBadge />);
    expect(screen.getByText("Admin")).toBeInTheDocument();

    mockPathname = "/matches";
    rerender(<AdminContextBadge />);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });
});
