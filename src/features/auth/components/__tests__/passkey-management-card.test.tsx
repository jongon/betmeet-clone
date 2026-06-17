// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { registerPasskey, passkeyDeleteFn } = vi.hoisted(() => ({
  registerPasskey: vi.fn(),
  passkeyDeleteFn: vi.fn(),
}));

const mockSupabase = {
  auth: {
    registerPasskey,
    passkey: {
      delete: passkeyDeleteFn,
    },
  },
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

import { PasskeyManagementCard } from "../passkey-management-card";

const samplePasskeys = [
  {
    id: "pk-001",
    friendlyName: "iPhone Touch ID",
    createdAt: "2026-06-10T12:00:00Z",
    lastUsedAt: null,
  },
  {
    id: "pk-002",
    friendlyName: "YubiKey 5C",
    createdAt: "2026-06-11T08:30:00Z",
    lastUsedAt: "2026-06-12T10:00:00Z",
  },
];

afterEach(() => {
  cleanup();
  registerPasskey.mockReset();
  passkeyDeleteFn.mockReset();
});

describe("PasskeyManagementCard", () => {
  it("renders the passkey list with item count badge", () => {
    render(<PasskeyManagementCard passkeys={samplePasskeys} />);

    expect(screen.getByText("Passkeys")).toBeInTheDocument();
    expect(screen.getByText("iPhone Touch ID")).toBeInTheDocument();
    expect(screen.getByText("YubiKey 5C")).toBeInTheDocument();
    expect(screen.getByText("2 passkey(s)")).toBeInTheDocument();
  });

  it("renders empty state when no passkeys", () => {
    render(<PasskeyManagementCard passkeys={[]} />);

    expect(screen.getByText("Passkeys")).toBeInTheDocument();
    expect(screen.getByText("No tienes passkeys registrados.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar un passkey" })).toBeInTheDocument();
  });

  it("shows a register button always visible", () => {
    render(<PasskeyManagementCard passkeys={samplePasskeys} />);

    expect(screen.getByRole("button", { name: "Registrar un passkey" })).toBeInTheDocument();
  });

  it("calls registerPasskey on register click and adds new item on success", async () => {
    registerPasskey.mockResolvedValueOnce({
      data: { id: "pk-003", friendly_name: "New Device", created_at: "2026-06-17T10:00:00Z" },
      error: null,
    });

    render(<PasskeyManagementCard passkeys={samplePasskeys} />);
    fireEvent.click(screen.getByRole("button", { name: "Registrar un passkey" }));

    await waitFor(() => {
      expect(registerPasskey).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText("New Device")).toBeInTheDocument();
    });
  });

  it("shows error when registerPasskey fails", async () => {
    registerPasskey.mockResolvedValueOnce({
      data: null,
      error: { message: "WebAuthn not supported" },
    });

    render(<PasskeyManagementCard passkeys={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Registrar un passkey" }));

    await waitFor(() => {
      expect(screen.getByText("WebAuthn not supported")).toBeInTheDocument();
    });
  });

  it("opens delete confirmation dialog on delete click", () => {
    render(<PasskeyManagementCard passkeys={samplePasskeys} />);

    const deleteButtons = screen.getAllByRole("button", { name: "Eliminar" });
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText("¿Eliminar este passkey?")).toBeInTheDocument();
    expect(screen.getByText("Ya no podrás usarlo para iniciar sesión.")).toBeInTheDocument();
  });

  it("calls passkey.delete on confirm and removes from list", async () => {
    passkeyDeleteFn.mockResolvedValueOnce({ error: null });

    render(<PasskeyManagementCard passkeys={samplePasskeys} />);

    const deleteButtons = screen.getAllByRole("button", { name: "Eliminar" });
    fireEvent.click(deleteButtons[0]);

    const dialog = screen.getByRole("dialog");
    const confirmDelete = within(dialog).getAllByRole("button", {
      name: "Eliminar",
    })[1]; // second is destructive confirm
    fireEvent.click(confirmDelete);

    await waitFor(() => {
      expect(passkeyDeleteFn).toHaveBeenCalledWith({ passkeyId: "pk-001" });
    });

    await waitFor(() => {
      expect(screen.queryByText("iPhone Touch ID")).not.toBeInTheDocument();
    });
  });
});
