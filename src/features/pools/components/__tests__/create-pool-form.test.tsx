// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../actions/create-pool", () => ({ createPool: vi.fn() }));
vi.mock("@/i18n/dictionary-provider", () => ({
  useDictionary: () => ({
    pools: {
      name: "Nombre",
      namePlaceholder: "La liga de la oficina",
      visibility: "Visibilidad",
      public: "Público",
      private: "Privado",
      capacity: "Capacidad",
      membersCanInvite: "Los miembros pueden invitar",
      membersCanInviteDescription: "Permite que los miembros no administradores inviten",
      creating: "Creando…",
      create: "Crear liga",
    },
  }),
}));

import { createPool } from "../../actions/create-pool";
import { CreatePoolForm } from "../create-pool-form";

describe("CreatePoolForm (Unit 45, US-45.1, BR-45.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createPool).mockResolvedValue({} as never);
  });

  afterEach(() => {
    cleanup();
  });

  it("does NOT show the membersCanInvite Switch by default (type=PUBLIC)", () => {
    render(<CreatePoolForm />);
    expect(screen.queryByTestId("create-pool-members-can-invite")).toBeNull();
  });

  it("shows the membersCanInvite Switch when type=PRIVATE", () => {
    render(<CreatePoolForm />);
    const select = screen.getByLabelText("Visibilidad") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "PRIVATE" } });
    expect(screen.getByTestId("create-pool-members-can-invite")).toBeDefined();
  });

  it("hides the Switch and resets value when type changes back to PUBLIC", () => {
    render(<CreatePoolForm />);
    const select = screen.getByLabelText("Visibilidad") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "PRIVATE" } });
    const toggle = screen.getByTestId("create-pool-members-can-invite");
    // Click to set membersCanInvite=false
    fireEvent.click(toggle);
    // Switch back to PUBLIC
    fireEvent.change(select, { target: { value: "PUBLIC" } });
    expect(screen.queryByTestId("create-pool-members-can-invite")).toBeNull();
  });

  it("sends membersCanInvite=true to createPool by default for PRIVATE pools", async () => {
    render(<CreatePoolForm />);
    const select = screen.getByLabelText("Visibilidad") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "PRIVATE" } });
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "My league" } });
    fireEvent.click(screen.getByTestId("create-pool-submit"));
    await waitFor(() => {
      expect(createPool).toHaveBeenCalledWith(
        expect.objectContaining({ type: "PRIVATE", membersCanInvite: true }),
      );
    });
  });

  it("sends membersCanInvite=false to createPool when the Switch is toggled off", async () => {
    render(<CreatePoolForm />);
    const select = screen.getByLabelText("Visibilidad") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "PRIVATE" } });
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "My league" } });
    const toggle = screen.getByTestId("create-pool-members-can-invite");
    fireEvent.click(toggle);
    fireEvent.click(screen.getByTestId("create-pool-submit"));
    await waitFor(() => {
      expect(createPool).toHaveBeenCalledWith(
        expect.objectContaining({ type: "PRIVATE", membersCanInvite: false }),
      );
    });
  });
});
