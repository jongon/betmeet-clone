import { describe, expect, it } from "vitest";
import {
  type DayMatchView,
  type FixtureDayGroup,
  selectLingeringLastSlot,
} from "../services/fixture-by-day";

// Minimal stubs — selectLingeringLastSlot only reads id and kickoffAt.
function m(id: string, kickoffAt: string | null): DayMatchView {
  return { id, kickoffAt } as unknown as DayMatchView;
}
function day(dayKey: string | null, ...matches: DayMatchView[]): FixtureDayGroup {
  return { dayKey, label: dayKey ?? "Fecha por confirmar", matches };
}

const ms = (iso: string) => Date.parse(iso);

describe("selectLingeringLastSlot (FR-REFINE-59.1)", () => {
  it("keeps the previous day's last slot until 1h before the next kickoff", () => {
    const pastDays = [
      day(
        "2026-06-20",
        m("noon", "2026-06-20T16:00:00.000Z"),
        m("night", "2026-06-20T21:00:00.000Z"),
      ),
    ];
    const currentDays = [day("2026-06-22", m("next", "2026-06-22T18:00:00.000Z"))];

    // Just before the cutoff (17:00 on the 22nd) → still visible, trimmed to the last slot.
    const before = selectLingeringLastSlot(pastDays, currentDays, ms("2026-06-22T16:59:00.000Z"));
    expect(before.cutoff).toBe(ms("2026-06-22T17:00:00.000Z"));
    expect(before.lingering?.dayKey).toBe("2026-06-20");
    expect(before.lingering?.matches.map((x) => x.id)).toEqual(["night"]);
  });

  it("hides the slot once the cutoff is reached", () => {
    const pastDays = [day("2026-06-20", m("night", "2026-06-20T21:00:00.000Z"))];
    const currentDays = [day("2026-06-22", m("next", "2026-06-22T18:00:00.000Z"))];

    const after = selectLingeringLastSlot(pastDays, currentDays, ms("2026-06-22T17:00:00.000Z"));
    expect(after.lingering).toBeNull();
    expect(after.cutoff).toBe(ms("2026-06-22T17:00:00.000Z"));
  });

  it("keeps every match sharing the day's latest kickoff", () => {
    const pastDays = [
      day(
        "2026-06-20",
        m("early", "2026-06-20T16:00:00.000Z"),
        m("late-a", "2026-06-20T21:00:00.000Z"),
        m("late-b", "2026-06-20T21:00:00.000Z"),
      ),
    ];
    const currentDays = [day("2026-06-22", m("next", "2026-06-22T18:00:00.000Z"))];

    const { lingering } = selectLingeringLastSlot(
      pastDays,
      currentDays,
      ms("2026-06-21T10:00:00.000Z"),
    );
    expect(lingering?.matches.map((x) => x.id)).toEqual(["late-a", "late-b"]);
  });

  it("lingers indefinitely when the next match has no confirmed date", () => {
    const pastDays = [day("2026-06-20", m("night", "2026-06-20T21:00:00.000Z"))];
    const currentDays = [day(null, m("tbd", null))];

    const result = selectLingeringLastSlot(pastDays, currentDays, ms("2026-07-01T00:00:00.000Z"));
    expect(result.cutoff).toBeNull();
    expect(result.lingering?.matches.map((x) => x.id)).toEqual(["night"]);
  });

  it("lingers when there is no next match at all", () => {
    const pastDays = [day("2026-06-20", m("final", "2026-06-20T21:00:00.000Z"))];

    const result = selectLingeringLastSlot(pastDays, [], ms("2026-07-01T00:00:00.000Z"));
    expect(result.cutoff).toBeNull();
    expect(result.lingering?.matches.map((x) => x.id)).toEqual(["final"]);
  });

  it("only considers the most recent past day", () => {
    const pastDays = [
      day("2026-06-18", m("older", "2026-06-18T21:00:00.000Z")),
      day("2026-06-20", m("recent", "2026-06-20T21:00:00.000Z")),
    ];
    const currentDays = [day("2026-06-22", m("next", "2026-06-22T18:00:00.000Z"))];

    const { lingering } = selectLingeringLastSlot(
      pastDays,
      currentDays,
      ms("2026-06-21T10:00:00.000Z"),
    );
    expect(lingering?.dayKey).toBe("2026-06-20");
    expect(lingering?.matches.map((x) => x.id)).toEqual(["recent"]);
  });

  it("returns nothing when there are no past days", () => {
    const currentDays = [day("2026-06-22", m("next", "2026-06-22T18:00:00.000Z"))];
    expect(selectLingeringLastSlot([], currentDays, Date.now())).toEqual({
      lingering: null,
      cutoff: null,
    });
  });
});
