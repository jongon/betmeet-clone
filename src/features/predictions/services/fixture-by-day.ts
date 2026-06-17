import type { PredictionMatchView } from "../types";

/** A match enriched with the human label of its phase (e.g. "Grupo A"). */
export type DayMatchView = PredictionMatchView & { phaseName: string };

/** One calendar day of the fixture, in chronological order (FR-REFINE-16.2). */
export interface FixtureDayGroup {
  /** `yyyy-mm-dd` in the selected timezone, or null for matches with no kickoff yet. */
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

interface DayGroupingOptions {
  timeZone?: string | null;
  locale?: string;
  tbdLabel?: string;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function coerceTimeZone(value: string | null | undefined): string {
  if (!value) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date(0));
    return value;
  } catch {
    return "UTC";
  }
}

export function formatLocalDayKey(date: Date, timeZone: string | null | undefined): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: coerceTimeZone(timeZone),
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function formatLocalDayLabel(
  date: Date,
  options: Required<Pick<DayGroupingOptions, "locale" | "timeZone">>,
) {
  const formatter = new Intl.DateTimeFormat(options.locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: coerceTimeZone(options.timeZone),
  });
  return capitalize(formatter.format(date));
}

function groupFlatMatchesByDay(
  matches: DayMatchView[],
  options: DayGroupingOptions = {},
): FixtureDayGroup[] {
  const timeZone = coerceTimeZone(options.timeZone);
  const locale = options.locale ?? "es";
  const tbdLabel = options.tbdLabel ?? "Fecha por confirmar";
  const byDay = new Map<string, FixtureDayGroup>();

  for (const match of matches) {
    const kickoff = match.kickoffAt ? new Date(match.kickoffAt) : null;
    const dayKey = kickoff ? formatLocalDayKey(kickoff, timeZone) : null;
    const mapKey = dayKey ?? "__tbd__";
    let group = byDay.get(mapKey);
    if (!group) {
      const label = kickoff ? formatLocalDayLabel(kickoff, { locale, timeZone }) : tbdLabel;
      group = { dayKey, label, matches: [] };
      byDay.set(mapKey, group);
    }
    group.matches.push(match);
  }

  return [...byDay.values()];
}

/**
 * Pure transform (FR-REFINE-16.2): flattens phases into a single list ordered by
 * kickoff (matchNumber breaks ties) and groups it by the selected calendar day,
 * preserving each match's group/round as a label. Undated knockout matches sink to a final
 * "Fecha por confirmar" bucket. No DB access — unit-testable in isolation.
 */
export function groupFixtureByDay(
  phases: PhaseForDayGrouping[],
  options: DayGroupingOptions = {},
): FixtureDayGroup[] {
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

  return groupFlatMatchesByDay(flat, options);
}

export function regroupFixtureDaysByTimeZone(
  days: FixtureDayGroup[],
  options: DayGroupingOptions = {},
): FixtureDayGroup[] {
  const flat = days.flatMap((day) => day.matches);
  flat.sort((a, b) => {
    const ta = a.kickoffAt ? Date.parse(a.kickoffAt) : Number.POSITIVE_INFINITY;
    const tb = b.kickoffAt ? Date.parse(b.kickoffAt) : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
  });
  return groupFlatMatchesByDay(flat, options);
}

/**
 * Splits the day groups into the ones already in the past and the rest (FR-REFINE-30.1).
 * The cut is by local calendar day, not by kickoff time: a day is "past" only when its
 * `dayKey` is strictly before `today`, so today's matches stay visible even if some have
 * already kicked off. The "Fecha por confirmar" bucket (`dayKey === null`) counts as
 * upcoming. Pure transform — input order is preserved in both lists.
 *
 * @param today `yyyy-mm-dd` reference day in the same timezone as the groups.
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
