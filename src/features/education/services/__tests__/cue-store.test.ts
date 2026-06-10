// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dismissCallout, shouldShowCallout } from "../cue-store";

describe("cue-store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a callout that has not been dismissed", () => {
    expect(shouldShowCallout("scoring-hint")).toBe(true);
  });

  it("hides a callout after it is dismissed", () => {
    dismissCallout("scoring-hint");
    expect(shouldShowCallout("scoring-hint")).toBe(false);
  });

  it("uses the canonical storage key", () => {
    dismissCallout("ranking-pool-only");
    expect(window.localStorage.getItem("cue:dismissed:ranking-pool-only")).toBe("1");
  });

  it("fails open (shows) when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(shouldShowCallout("scoring-hint")).toBe(true);
  });

  it("does not throw when setItem fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => dismissCallout("scoring-hint")).not.toThrow();
  });
});
