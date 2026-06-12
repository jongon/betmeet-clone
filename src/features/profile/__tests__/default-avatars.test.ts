import { describe, expect, it } from "vitest";
import { LOCAL_FALLBACK_AVATARS, resolveLocalAvatarUrl } from "../default-avatars";

describe("local fallback avatars", () => {
  it("provides a non-empty bundled set with local: ids and static paths", () => {
    expect(LOCAL_FALLBACK_AVATARS.length).toBeGreaterThan(0);
    for (const avatar of LOCAL_FALLBACK_AVATARS) {
      expect(avatar.id.startsWith("local:")).toBe(true);
      expect(avatar.storageUrl).toMatch(/^\/avatars\/local-\d+\.svg$/);
    }
  });

  it("resolves a known local id to its bundled path", () => {
    expect(resolveLocalAvatarUrl("local:1")).toBe("/avatars/local-1.svg");
  });

  it("returns null for non-local or unknown ids", () => {
    expect(resolveLocalAvatarUrl("db-uuid-123")).toBeNull();
    expect(resolveLocalAvatarUrl("local:999")).toBeNull();
  });
});
