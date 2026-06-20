// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useKickoffTick } from "../use-kickoff-tick";

describe("useKickoffTick", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current time on mount", () => {
    const { result } = renderHook(() => useKickoffTick([]));
    expect(result.current).toBe(Date.now());
  });

  it("re-renders with a fresh now once the next kickoff is reached", () => {
    const kickoff = Date.now() + 30_000; // 30s in the future
    const { result } = renderHook(() => useKickoffTick([kickoff]));

    expect(result.current).toBeLessThan(kickoff);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current).toBeGreaterThanOrEqual(kickoff);
  });

  it("ignores kickoffs already in the past (no timer scheduled)", () => {
    const past = Date.now() - 1_000;
    const { result } = renderHook(() => useKickoffTick([past]));
    const initial = result.current;

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    // now is unchanged because no timer was armed for a past kickoff
    expect(result.current).toBe(initial);
  });

  it("wakes at the earliest of several future kickoffs", () => {
    const soon = Date.now() + 10_000;
    const later = Date.now() + 60_000;
    const { result } = renderHook(() => useKickoffTick([later, soon]));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current).toBeGreaterThanOrEqual(soon);
    expect(result.current).toBeLessThan(later);
  });
});
