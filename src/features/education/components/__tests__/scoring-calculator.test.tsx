// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScoringCalculator } from "../scoring-calculator";

afterEach(cleanup);

/**
 * FR-REFINE-15.7: the penalty shootout is captured for BOTH "Tu predicción" and
 * "Resultado real", each deriving its own winner, mirroring the main score grid.
 */
describe("ScoringCalculator penalties", () => {
  it("shows predicted and actual shootout winners when the knockout is tied at 90'", () => {
    render(<ScoringCalculator />);
    // Defaults: knockout on, real result 2-2 (tie) → penalty section visible.
    expect(screen.getByTestId("calculator-predicted-penalty-winner")).toBeInTheDocument();
    expect(screen.getByTestId("calculator-actual-penalty-winner")).toBeInTheDocument();
    // Both shootouts default to a home win.
    expect(screen.getByTestId("calculator-predicted-penalty-winner")).toHaveTextContent(/local/i);
    expect(screen.getByTestId("calculator-actual-penalty-winner")).toHaveTextContent(/local/i);
  });

  it("hides the penalty section when the real match is not tied", () => {
    render(<ScoringCalculator />);
    // Make the real result 3-2 → no penalties.
    fireEvent.change(screen.getByTestId("calculator-act-home"), { target: { value: "3" } });
    expect(screen.queryByTestId("calculator-predicted-penalty-winner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("calculator-actual-penalty-winner")).not.toBeInTheDocument();
  });

  it("flags an invalid (tied) shootout score per column", () => {
    render(<ScoringCalculator />);
    // Tie the actual shootout 3-3 → its winner cannot be derived.
    fireEvent.change(screen.getByTestId("calculator-act-pen-home"), { target: { value: "3" } });
    fireEvent.change(screen.getByTestId("calculator-act-pen-away"), { target: { value: "3" } });
    expect(screen.queryByTestId("calculator-actual-penalty-winner")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
