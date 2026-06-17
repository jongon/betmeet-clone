import { revalidatePath, updateTag } from "next/cache";
import { COMPETITION_FIXTURE_TAG } from "@/features/competition/cache-tags";
import { RANKINGS_TAG } from "@/features/scoring-rankings/cache-tags";

type RevalidateResultViewsOptions = {
  adminDashboard?: boolean;
  adminMatches?: boolean;
};

export function revalidateResultViews(options: RevalidateResultViewsOptions = {}) {
  updateTag(COMPETITION_FIXTURE_TAG);
  updateTag(RANKINGS_TAG);

  revalidatePath("/matches");
  revalidatePath("/rankings");
  revalidatePath("/pools");
  revalidatePath("/pools/[id]", "page");
  revalidatePath("/pools/[id]/leaderboard", "page");

  if (options.adminDashboard) revalidatePath("/admin");
  if (options.adminMatches) revalidatePath("/admin/matches");
}
