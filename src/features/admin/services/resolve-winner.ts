interface ResolveWinnerInput {
  homeScore: number;
  awayScore: number;
  isKnockout: boolean;
  penaltyWinnerTeamId: string | null;
  homeTeamId: string;
  awayTeamId: string;
}

/**
 * Resolves the winning team id from a forced result (BR-7.3). By score, or — for
 * a tied knockout — the predicted penalty winner. Tied group stage ⇒ no winner.
 */
export function resolveWinner(input: ResolveWinnerInput): string | null {
  if (input.homeScore > input.awayScore) return input.homeTeamId;
  if (input.homeScore < input.awayScore) return input.awayTeamId;
  if (input.isKnockout) return input.penaltyWinnerTeamId;
  return null;
}
