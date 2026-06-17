import { beforeEach, describe, expect, it, vi } from "vitest";

const { getClaims } = vi.hoisted(() => ({ getClaims: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims } })),
}));

// `getAuthUser` is wrapped in React `cache()` (created at module eval). Reset the
// module registry between cases so each test gets a fresh cache and the memoized
// result of one test never leaks into the next.
describe("getAuthUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("derives the user from the verified JWT claims", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1", email: "a@b.com", email_verified: true } },
      error: null,
    });
    const { getAuthUser } = await import("../current-user");

    expect(await getAuthUser()).toEqual({
      id: "user-1",
      email: "a@b.com",
      emailVerified: true,
    });
    expect(getClaims).toHaveBeenCalledTimes(1);
  });

  it("defaults email/emailVerified when the claims omit them", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-2" } }, error: null });
    const { getAuthUser } = await import("../current-user");

    expect(await getAuthUser()).toEqual({ id: "user-2", email: null, emailVerified: false });
  });

  it("returns null when there is no session", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const { getAuthUser } = await import("../current-user");

    expect(await getAuthUser()).toBeNull();
  });

  it("returns null when claim verification errors", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("invalid") });
    const { getAuthUser } = await import("../current-user");

    expect(await getAuthUser()).toBeNull();
  });
});
