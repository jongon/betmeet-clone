// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Cut the server-action import chain (next/headers, supabase server client).
const { signUp } = vi.hoisted(() => ({ signUp: vi.fn() }));
vi.mock("../../actions/sign-up", () => ({ signUp }));

import { SignUpForm } from "../sign-up-form";

afterEach(() => {
  cleanup();
  signUp.mockReset();
});

/**
 * FR-REFINE-15.12: email format, password rule and confirm-password match are
 * validated on the client before the request reaches the server action.
 */
describe("SignUpForm client validation", () => {
  function fill(id: string, value: string) {
    fireEvent.change(screen.getByLabelText(id), { target: { value } });
  }

  it("blocks submission and shows errors for an invalid email + mismatched passwords", async () => {
    render(<SignUpForm />);
    fill("Email", "not-an-email");
    fill("Password", "supersecret");
    fill("Confirm password", "different");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/invalid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("calls the server action when the form is valid", async () => {
    render(<SignUpForm />);
    fill("Email", "jon@example.com");
    fill("Password", "supersecret");
    fill("Confirm password", "supersecret");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(signUp).toHaveBeenCalledTimes(1));
  });
});
