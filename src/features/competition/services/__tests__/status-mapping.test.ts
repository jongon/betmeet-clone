import { describe, expect, it } from "vitest";
import { mapFootballDataStatus, mapProviderStatus } from "../status-mapping";

describe("mapProviderStatus", () => {
  it("maps provider live statuses", () => {
    expect(
      mapProviderStatus("1H", new Date("2026-06-11T19:00:00Z"), new Date("2026-06-11T19:10:00Z")),
    ).toBe("LIVE");
  });

  it("maps finished statuses", () => {
    expect(mapProviderStatus("FT", null)).toBe("FINISHED");
  });

  it("locks scheduled matches after kickoff if provider is late", () => {
    expect(
      mapProviderStatus("NS", new Date("2026-06-11T19:00:00Z"), new Date("2026-06-11T19:01:00Z")),
    ).toBe("LOCKED");
  });

  it("keeps future matches scheduled", () => {
    expect(
      mapProviderStatus("NS", new Date("2026-06-11T19:00:00Z"), new Date("2026-06-11T18:59:00Z")),
    ).toBe("SCHEDULED");
  });
});

describe("mapFootballDataStatus", () => {
  it("maps SCHEDULED to SCHEDULED", () => {
    expect(mapFootballDataStatus("SCHEDULED")).toBe("SCHEDULED");
  });

  it("maps TIMED to SCHEDULED", () => {
    expect(mapFootballDataStatus("TIMED")).toBe("SCHEDULED");
  });

  it("maps IN_PLAY to LIVE", () => {
    expect(mapFootballDataStatus("IN_PLAY")).toBe("LIVE");
  });

  it("maps PAUSED to LIVE", () => {
    expect(mapFootballDataStatus("PAUSED")).toBe("LIVE");
  });

  it("maps FINISHED to FINISHED", () => {
    expect(mapFootballDataStatus("FINISHED")).toBe("FINISHED");
  });

  it("maps AWARDED to FINISHED", () => {
    expect(mapFootballDataStatus("AWARDED")).toBe("FINISHED");
  });

  it("maps POSTPONED to POSTPONED", () => {
    expect(mapFootballDataStatus("POSTPONED")).toBe("POSTPONED");
  });

  it("maps SUSPENDED to POSTPONED", () => {
    expect(mapFootballDataStatus("SUSPENDED")).toBe("POSTPONED");
  });

  it("maps CANCELLED to CANCELLED", () => {
    expect(mapFootballDataStatus("CANCELLED")).toBe("CANCELLED");
  });

  it("defaults unknown status to SCHEDULED", () => {
    expect(mapFootballDataStatus("UNKNOWN")).toBe("SCHEDULED");
  });

  it("handles null gracefully", () => {
    expect(mapFootballDataStatus(null)).toBe("SCHEDULED");
  });

  it("handles undefined gracefully", () => {
    expect(mapFootballDataStatus(undefined)).toBe("SCHEDULED");
  });

  it("is case-insensitive", () => {
    expect(mapFootballDataStatus("finished")).toBe("FINISHED");
  });
});
