import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));

import { revalidatePath, updateTag } from "next/cache";
import { COMPETITION_FIXTURE_TAG } from "@/features/competition/cache-tags";
import { RANKINGS_TAG } from "@/features/scoring-rankings/cache-tags";
import { revalidateResultViews } from "../revalidate-result-views";

describe("revalidateResultViews (Unit 35)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("immediately expires result-related cache tags", () => {
    revalidateResultViews();

    expect(updateTag).toHaveBeenCalledWith(COMPETITION_FIXTURE_TAG);
    expect(updateTag).toHaveBeenCalledWith(RANKINGS_TAG);
  });

  it("revalidates user-facing result routes", () => {
    revalidateResultViews();

    expect(revalidatePath).toHaveBeenCalledWith("/matches", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/rankings", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/pools", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/pools/[id]", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/pools/[id]/leaderboard", "page");
  });

  it("revalidates optional admin routes only when requested", () => {
    revalidateResultViews();

    expect(revalidatePath).not.toHaveBeenCalledWith("/admin", "page");
    expect(revalidatePath).not.toHaveBeenCalledWith("/admin/matches", "page");

    vi.clearAllMocks();
    revalidateResultViews({ adminDashboard: true, adminMatches: true });

    expect(revalidatePath).toHaveBeenCalledWith("/admin", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/matches", "page");
  });
});
