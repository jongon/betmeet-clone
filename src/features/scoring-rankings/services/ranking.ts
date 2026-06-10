export interface Rankable {
  totalPoints: number;
}

/**
 * Dense ranking "1, 1, 2" (BL-6, Q4=B): tied entries share a position and the
 * next position increments by one.
 *
 * Note: this deviates from the US-5.2 AC example (standard "1, 1, 3"); explicit
 * user decision in Functional Design Q4=B / F2 (BR-6.13).
 *
 * Input must already be sorted by totalPoints descending.
 */
export function assignDensePositions<T extends Rankable>(
  rowsSortedDesc: T[],
): (T & { position: number; isTied: boolean })[] {
  const counts = new Map<number, number>();
  for (const row of rowsSortedDesc) {
    counts.set(row.totalPoints, (counts.get(row.totalPoints) ?? 0) + 1);
  }

  let position = 0;
  let prevPoints: number | null = null;

  return rowsSortedDesc.map((row) => {
    if (prevPoints === null || row.totalPoints !== prevPoints) {
      position += 1;
    }
    prevPoints = row.totalPoints;
    return { ...row, position, isTied: (counts.get(row.totalPoints) ?? 0) > 1 };
  });
}
