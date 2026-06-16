import type { PredictionMatchView } from "../types";

/** A match enriched with the human label of its phase (e.g. "Grupo A"). */
export type DayMatchView = PredictionMatchView & { phaseName: string };

/** One calendar day of the fixture, in chronological order (FR-REFINE-16.2). */
export interface FixtureDayGroup {
  /** `yyyy-mm-dd` (UTC) ordering key, or null for matches with no kickoff yet. */
  dayKey: string | null;
  /** Display label, e.g. "Jueves, 11 de junio" or "Fecha por confirmar". */
  label: string;
  matches: DayMatchView[];
}

type PhaseForDayGrouping = {
  name: string;
  groupCode: string | null;
  matches: PredictionMatchView[];
};

const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Pure transform (FR-REFINE-16.2): flattens phases into a single list ordered by
 * kickoff (matchNumber breaks ties) and groups it by UTC calendar day, preserving
 * each match's group/round as a label. UTC keeps the order deterministic and aligned
 * with the per-card kickoff rendering; undated knockout matches sink to a final
 * "Fecha por confirmar" bucket. No DB access — unit-testable in isolation.
 */
export function groupFixtureByDay(phases: PhaseForDayGrouping[]): FixtureDayGroup[] {
  const flat: DayMatchView[] = phases.flatMap((phase) =>
    phase.matches.map((match) => ({
      ...match,
      phaseName: phase.groupCode ? `Grupo ${phase.groupCode}` : phase.name,
    })),
  );

  flat.sort((a, b) => {
    const ta = a.kickoffAt ? Date.parse(a.kickoffAt) : Number.POSITIVE_INFINITY;
    const tb = b.kickoffAt ? Date.parse(b.kickoffAt) : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
  });

  const byDay = new Map<string, FixtureDayGroup>();
  for (const match of flat) {
    const dayKey = match.kickoffAt ? match.kickoffAt.slice(0, 10) : null;
    const mapKey = dayKey ?? "__tbd__";
    let group = byDay.get(mapKey);
    if (!group) {
      const label = match.kickoffAt
        ? capitalize(DAY_LABEL_FORMAT.format(new Date(match.kickoffAt)))
        : "Fecha por confirmar";
      group = { dayKey, label, matches: [] };
      byDay.set(mapKey, group);
    }
    group.matches.push(match);
  }

  return [...byDay.values()];
}

/**
 * Splits the day groups into the ones already in the past and the rest (FR-REFINE-30.1).
 * The cut is by UTC calendar day, not by kickoff time: a day is "past" only when its
 * `dayKey` is strictly before `today`, so today's matches stay visible even if some have
 * already kicked off. The "Fecha por confirmar" bucket (`dayKey === null`) counts as
 * upcoming. Pure transform — input order is preserved in both lists.
 *
 * @param today `yyyy-mm-dd` (UTC) reference day, e.g. `new Date().toISOString().slice(0, 10)`.
 */
export function partitionDaysByToday(
  days: FixtureDayGroup[],
  today: string,
): { pastDays: FixtureDayGroup[]; currentDays: FixtureDayGroup[] } {
  const pastDays: FixtureDayGroup[] = [];
  const currentDays: FixtureDayGroup[] = [];
  for (const day of days) {
    if (day.dayKey !== null && day.dayKey < today) {
      pastDays.push(day);
    } else {
      currentDays.push(day);
    }
  }
  return { pastDays, currentDays };
}
