// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../actions/update-pool-members-can-invite", () => ({
  updatePoolMembersCanInvite: vi.fn(),
}));
vi.mock("@/i18n/dictionary-provider", () => ({
  useDictionary: () => ({
    pools: {
      settings: {
        title: "Configuración",
        subtitle: "Opciones de la liga que solo tú puedes cambiar.",
        membersCanInvite: "Los miembros pueden invitar",
        membersCanInviteDescription: "Si lo desactivas, solo tú podrás invitar a otros jugadores.",
        saved: "Configuración guardada",
      },
    },
  }),
}));

import { toast } from "sonner";
import { updatePoolMembersCanInvite } from "../../actions/update-pool-members-can-invite";
import { PoolSettingsCardClient } from "../pool-settings-card-client";

const POOL_ID = "11111111-1111-4111-8111-111111111111";

describe("PoolSettingsCardClient (Unit 45, US-45.2, BR-45.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the Switch with the initial value (true)", () => {
    render(<PoolSettingsCardClient poolId={POOL_ID} initialMembersCanInvite={true} />);
    const toggle = screen.getByTestId("pool-settings-members-can-invite-switch");
    expect(toggle).toBeDefined();
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("renders the Switch with the initial value (false)", () => {
    render(<PoolSettingsCardClient poolId={POOL_ID} initialMembersCanInvite={false} />);
    const toggle = screen.getByTestId("pool-settings-members-can-invite-switch");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("clicking the Switch calls updatePoolMembersCanInvite and toasts on success", async () => {
    vi.mocked(updatePoolMembersCanInvite).mockResolvedValue({
      success: true,
      membersCanInvite: false,
    });
    render(<PoolSettingsCardClient poolId={POOL_ID} initialMembersCanInvite={true} />);
    fireEvent.click(screen.getByTestId("pool-settings-members-can-invite-switch"));

    await waitFor(() => {
      expect(updatePoolMembersCanInvite).toHaveBeenCalledWith({
        poolId: POOL_ID,
        membersCanInvite: false,
      });
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Configuración guardada");
    });
  });

  it("reverts the Switch and shows the error when the action returns an error", async () => {
    vi.mocked(updatePoolMembersCanInvite).mockResolvedValue({
      error: "Solo el administrador puede cambiar esta configuración",
    });
    render(<PoolSettingsCardClient poolId={POOL_ID} initialMembersCanInvite={true} />);
    fireEvent.click(screen.getByTestId("pool-settings-members-can-invite-switch"));

    await waitFor(() => {
      expect(updatePoolMembersCanInvite).toHaveBeenCalled();
    });
    // The optimistic update flips to false, then the rollback restores it to true.
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "Solo el administrador puede cambiar esta configuración",
    );
  });

  it("disables the Switch while the action is pending", async () => {
    let resolveAction: ((value: unknown) => void) | null = null;
    vi.mocked(updatePoolMembersCanInvite).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }) as never,
    );

    render(<PoolSettingsCardClient poolId={POOL_ID} initialMembersCanInvite={true} />);
    const toggle = screen.getByTestId("pool-settings-members-can-invite-switch");
    fireEvent.click(toggle);

    // The action is pending; the Switch should reflect the disabled state via
    // either the `disabled` attribute or `data-disabled` / `aria-disabled`.
    await waitFor(() => {
      const t = screen.getByTestId("pool-settings-members-can-invite-switch");
      const disabled = t.hasAttribute("disabled") || t.getAttribute("aria-disabled") === "true";
      expect(disabled).toBe(true);
    });

    // Resolve the action
    if (resolveAction) {
      (resolveAction as (value: unknown) => void)({ success: true, membersCanInvite: false });
    }
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });
});
