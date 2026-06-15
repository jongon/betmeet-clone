import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));

// `getAuthUser` is wrapped in React `cache()` (created at module eval). Reset the
// module registry between cases so each test gets a fresh cache and the memoized
// result of one test never leaks into the next.
describe("getAuthUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns the authenticated user from the Auth server", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const { getAuthUser } = await import("../current-user");

    expect(await getAuthUser()).toEqual({ id: "user-1" });
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it("returns null when there is no session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { getAuthUser } = await import("../current-user");

    expect(await getAuthUser()).toBeNull();
  });
});
