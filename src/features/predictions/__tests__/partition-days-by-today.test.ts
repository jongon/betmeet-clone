import { describe, expect, it } from "vitest";
import {
  type DayMatchView,
  type FixtureDayGroup,
  formatLocalDayKey,
  partitionDaysByToday,
} from "../services/fixture-by-day";

// Minimal day-group stub — partitionDaysByToday only reads dayKey.
function day(dayKey: string | null, ...matchIds: string[]): FixtureDayGroup {
  return {
    dayKey,
    label: dayKey ?? "Fecha por confirmar",
    matches: matchIds.map((id) => ({ id }) as unknown as DayMatchView),
  };
}

describe("partitionDaysBytoday (FR-REFINE-30.1)", () => {
  const today = "2026-06-16";

  it("sends days strictly before today to pastDays and the rest to currentDays", () => {
    const { pastDays, currentDays } = partitionDaysByToday(
      [day("2026-06-14"), day("2026-06-15"), day("2026-06-16"), day("2026-06-18")],
      today,
    );

    expect(pastDays.map((d) => d.dayKey)).toEqual(["2026-06-14", "2026-06-15"]);
    expect(currentDays.map((d) => d.dayKey)).toEqual(["2026-06-16", "2026-06-18"]);
  });

  it("keeps today in currentDays even when some of its matches already kicked off", () => {
    // Cut is by day, not by kickoff time: today stays fully visible.
    const todayGroup = day("2026-06-16", "played-this-morning", "tonight");
    const { pastDays, currentDays } = partitionDaysByToday([todayGroup], today);

    expect(pastDays).toEqual([]);
    expect(currentDays).toEqual([todayGroup]);
  });

  it("treats the undated 'Fecha por confirmar' bucket (dayKey null) as upcoming", () => {
    const { pastDays, currentDays } = partitionDaysByToday([day(null, "tbd")], today);

    expect(pastDays).toEqual([]);
    expect(currentDays.map((d) => d.dayKey)).toEqual([null]);
  });

  it("returns an empty pastDays when nothing is before today", () => {
    const { pastDays, currentDays } = partitionDaysByToday(
      [day("2026-06-16"), day("2026-06-20")],
      today,
    );

    expect(pastDays).toEqual([]);
    expect(currentDays).toHaveLength(2);
  });

  it("preserves input order within each list", () => {
    const { pastDays, currentDays } = partitionDaysByToday(
      [day("2026-06-11"), day("2026-06-12"), day("2026-06-17"), day(null)],
      today,
    );

    expect(pastDays.map((d) => d.dayKey)).toEqual(["2026-06-11", "2026-06-12"]);
    expect(currentDays.map((d) => d.dayKey)).toEqual(["2026-06-17", null]);
  });

  it("uses the caller-provided local-day today value", () => {
    const todayInMadrid = formatLocalDayKey(new Date("2026-06-17T23:30:00.000Z"), "Europe/Madrid");
    const { pastDays, currentDays } = partitionDaysByToday(
      [day("2026-06-17", "utc-day"), day("2026-06-18", "madrid-day")],
      todayInMadrid,
    );

    expect(todayInMadrid).toBe("2026-06-18");
    expect(pastDays.map((d) => d.dayKey)).toEqual(["2026-06-17"]);
    expect(currentDays.map((d) => d.dayKey)).toEqual(["2026-06-18"]);
  });
});
