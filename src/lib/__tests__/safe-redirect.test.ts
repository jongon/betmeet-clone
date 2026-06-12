import { describe, expect, it } from "vitest";
import { sanitizeNext } from "../safe-redirect";

describe("sanitizeNext", () => {
  it("allows internal absolute paths", () => {
    expect(sanitizeNext("/pools/join/ABC123")).toBe("/pools/join/ABC123");
    expect(sanitizeNext("/matches?tab=live")).toBe("/matches?tab=live");
  });

  it("falls back when missing", () => {
    expect(sanitizeNext(undefined)).toBe("/matches");
    expect(sanitizeNext(null)).toBe("/matches");
    expect(sanitizeNext("")).toBe("/matches");
  });

  it("blocks open redirects", () => {
    expect(sanitizeNext("//evil.com")).toBe("/matches");
    expect(sanitizeNext("https://evil.com")).toBe("/matches");
    expect(sanitizeNext("http://evil.com")).toBe("/matches");
    expect(sanitizeNext("/\\evil.com")).toBe("/matches");
    expect(sanitizeNext("evil.com")).toBe("/matches");
  });

  it("honors a custom fallback", () => {
    expect(sanitizeNext(undefined, "/")).toBe("/");
    expect(sanitizeNext("//evil", "/")).toBe("/");
  });
});
