import { describe, expect, it } from "vitest";
import {
  coerceTimeZone,
  formatLocalDayKey,
  groupFixtureByDay,
  nextLocalMidnightMs,
} from "../services/fixture-by-day";
import type { PredictionMatchView } from "../types";

// Minimal match stub — groupFixtureByDay only reads id, kickoffAt and matchNumber.
function match(id: string, kickoffAt: string | null, matchNumber: number | null) {
  return { id, kickoffAt, matchNumber } as unknown as PredictionMatchView;
}

describe("groupFixtureByDay (FR-REFINE-16.2)", () => {
  it("orders matches by occurrence across phases and groups them by day", () => {
    // Group A and Group B matches interleave by date in the real fixture.
    const days = groupFixtureByDay([
      {
        name: "Group A",
        groupCode: "A",
        matches: [
          match("a1", "2026-06-11T18:00:00.000Z", 1),
          match("a2", "2026-06-16T18:00:00.000Z", 25),
        ],
      },
      {
        name: "Group B",
        groupCode: "B",
        matches: [
          match("b1", "2026-06-11T21:00:00.000Z", 2),
          match("b2", "2026-06-12T15:00:00.000Z", 3),
        ],
      },
    ]);

    // Three distinct days, in chronological order.
    expect(days.map((d) => d.dayKey)).toEqual(["2026-06-11", "2026-06-12", "2026-06-16"]);
    // Day 1 holds the two June-11 matches, kickoff-ordered (a1 18:00 before b1 21:00) —
    // not grouped by phase.
    expect(days[0].matches.map((m) => m.id)).toEqual(["a1", "b1"]);
    expect(days[1].matches.map((m) => m.id)).toEqual(["b2"]);
    expect(days[2].matches.map((m) => m.id)).toEqual(["a2"]);
  });

  it("labels each match with its group and uses the phase name for knockouts", () => {
    const days = groupFixtureByDay([
      { name: "Group C", groupCode: "C", matches: [match("c1", "2026-06-13T18:00:00.000Z", 5)] },
      {
        name: "Round of 16",
        groupCode: null,
        matches: [match("k1", "2026-07-01T18:00:00.000Z", 80)],
      },
    ]);

    const labels = days.flatMap((d) => d.matches.map((m) => m.phaseName));
    expect(labels).toEqual(["Grupo C", "Round of 16"]);
  });

  it("buckets matches without a kickoff under 'Fecha por confirmar', last", () => {
    const days = groupFixtureByDay([
      {
        name: "Final",
        groupCode: null,
        matches: [match("tbd", null, 104), match("dated", "2026-06-11T18:00:00.000Z", 1)],
      },
    ]);

    expect(days[0].dayKey).toBe("2026-06-11");
    const tbd = days[days.length - 1];
    expect(tbd.dayKey).toBeNull();
    expect(tbd.label).toBe("Fecha por confirmar");
    expect(tbd.matches.map((m) => m.id)).toEqual(["tbd"]);
  });

  it("groups by the provided local timezone instead of always using UTC", () => {
    const phases = [
      {
        name: "Group A",
        groupCode: "A",
        matches: [match("late", "2026-06-17T23:00:00.000Z", 1)],
      },
    ];

    expect(groupFixtureByDay(phases, { timeZone: "UTC" })[0].dayKey).toBe("2026-06-17");
    expect(groupFixtureByDay(phases, { timeZone: "Europe/Madrid" })[0].dayKey).toBe("2026-06-18");
  });

  it("falls back to UTC for invalid or missing timezones", () => {
    const date = new Date("2026-06-17T23:00:00.000Z");

    expect(coerceTimeZone("Not/AZone")).toBe("UTC");
    expect(formatLocalDayKey(date, "Not/AZone")).toBe("2026-06-17");
    expect(formatLocalDayKey(date, null)).toBe("2026-06-17");
  });
});

describe("nextLocalMidnightMs (Unit 59 — live day rollover)", () => {
  it("returns the next UTC midnight for UTC", () => {
    expect(nextLocalMidnightMs("2026-06-20", "UTC")).toBe(Date.parse("2026-06-21T00:00:00.000Z"));
  });

  it("returns the instant of next local midnight in a +offset timezone", () => {
    // Europe/Madrid is UTC+2 in June, so local 2026-06-21T00:00 is 2026-06-20T22:00Z.
    expect(nextLocalMidnightMs("2026-06-20", "Europe/Madrid")).toBe(
      Date.parse("2026-06-20T22:00:00.000Z"),
    );
  });

  it("returns the instant of next local midnight in a -offset timezone", () => {
    // America/New_York is UTC-4 in June, so local 2026-06-21T00:00 is 2026-06-21T04:00Z.
    expect(nextLocalMidnightMs("2026-06-20", "America/New_York")).toBe(
      Date.parse("2026-06-21T04:00:00.000Z"),
    );
  });

  it("falls back to UTC for an invalid timezone", () => {
    expect(nextLocalMidnightMs("2026-06-20", "Not/AZone")).toBe(
      Date.parse("2026-06-21T00:00:00.000Z"),
    );
  });
});
