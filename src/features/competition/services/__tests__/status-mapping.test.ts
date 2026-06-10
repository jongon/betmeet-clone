import { describe, expect, it } from "vitest";
import { mapProviderStatus } from "../status-mapping";

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
