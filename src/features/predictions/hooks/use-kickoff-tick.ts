"use client";

import { useEffect, useState } from "react";

/**
 * Reactive "now" that wakes up exactly when the next relevant kickoff is
 * reached, so prediction forms can flip to read-only in a stale tab without
 * waiting for a server round-trip. The server (`getPredictionEligibility` in
 * `savePrediction`) remains the source of truth; this only sharpens the UI.
 *
 * Given the future kickoff timestamps (ms) that matter, it schedules a single
 * `setTimeout` to the earliest one and re-renders on fire. No `setInterval`:
 * there is nothing to refresh between kickoffs.
 *
 * @param kickoffTimestamps kickoff times in epoch ms (past entries are ignored).
 * @returns the current time in epoch ms, updated as kickoffs pass.
 */
const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000; // setTimeout overflows past ~24.8 days; cap and re-arm.

export function useKickoffTick(kickoffTimestamps: number[]): number {
  const [now, setNow] = useState(() => Date.now());

  // Serialized key so the effect only re-arms when the set of times changes,
  // not on every render (callers usually build a fresh array each render).
  const key = kickoffTimestamps.join(",");

  useEffect(() => {
    const timestamps = key === "" ? [] : key.split(",").map(Number);
    let timer: ReturnType<typeof setTimeout> | undefined;

    function arm() {
      const current = Date.now();
      setNow(current);
      const next = timestamps
        .filter((t) => t > current)
        .reduce((min, t) => (t < min ? t : min), Number.POSITIVE_INFINITY);
      if (!Number.isFinite(next)) return;
      const delay = Math.min(next - current, MAX_TIMEOUT_MS);
      timer = setTimeout(arm, delay);
    }

    arm();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [key]);

  return now;
}
