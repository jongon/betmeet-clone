// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Cut the server-action import chain (next/headers, supabase server client).
const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("@/features/auth/actions/sign-out", () => ({ signOut }));

import { UserMenu } from "../user-menu";

afterEach(cleanup);

describe("UserMenu", () => {
  const base = { displayNickname: "Jon#1234", avatarUrl: "" };

  it("renders the session nickname on the trigger", () => {
    render(<UserMenu {...base} isAdmin={false} />);
    expect(screen.getByTestId("user-menu-trigger")).toHaveTextContent("Jon#1234");
  });

  it("hides the admin entry for non-admins", async () => {
    render(<UserMenu {...base} isAdmin={false} />);
    // Open the menu so portal content mounts, then confirm sign-out is present
    // (proves the menu opened) while the admin entry is absent.
    screen.getByTestId("user-menu-trigger").click();
    await screen.findByTestId("user-menu-sign-out");
    expect(screen.queryByTestId("user-menu-admin")).not.toBeInTheDocument();
  });

  it("shows the admin entry for admins", async () => {
    render(<UserMenu {...base} isAdmin />);
    screen.getByTestId("user-menu-trigger").click();
    expect(await screen.findByTestId("user-menu-admin")).toBeInTheDocument();
  });

  it("wires sign-out to the existing server action via a form", async () => {
    render(<UserMenu {...base} isAdmin={false} />);
    screen.getByTestId("user-menu-trigger").click();
    const item = await screen.findByTestId("user-menu-sign-out");
    // The sign-out item submits a <form action={signOut}>.
    expect(item.closest("form")).toBeInTheDocument();
  });
});
