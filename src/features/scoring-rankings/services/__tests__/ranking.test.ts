import { describe, expect, it } from "vitest";
import { assignDensePositions } from "../ranking";

describe("assignDensePositions (dense '1,1,2', BR-6.13)", () => {
  it("ties share position and the next increments by one", () => {
    const ranked = assignDensePositions([
      { totalPoints: 10 },
      { totalPoints: 10 },
      { totalPoints: 8 },
      { totalPoints: 8 },
      { totalPoints: 7 },
    ]);
    expect(ranked.map((r) => r.position)).toEqual([1, 1, 2, 2, 3]);
  });

  it("flags tied rows", () => {
    const ranked = assignDensePositions([
      { totalPoints: 5 },
      { totalPoints: 5 },
      { totalPoints: 3 },
    ]);
    expect(ranked.map((r) => r.isTied)).toEqual([true, true, false]);
  });

  it("handles all-distinct as 1,2,3", () => {
    const ranked = assignDensePositions([
      { totalPoints: 9 },
      { totalPoints: 6 },
      { totalPoints: 1 },
    ]);
    expect(ranked.map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it("handles empty input", () => {
    expect(assignDensePositions([])).toEqual([]);
  });
});
