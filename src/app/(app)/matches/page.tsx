import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUserId } from "@/features/pools/services/session";
import { MatchesFixtureView } from "@/features/predictions/components/matches-fixture-view";
import {
  getFixtureByDayWithMyPredictions,
  partitionDaysByToday,
} from "@/features/predictions/queries";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

export const revalidate = 60;

export default async function MatchesPage() {
  const dictionary = getDictionary(await getRequestLocale());
  const userId = await getCurrentUserId();
  const fixture = await getFixtureByDayWithMyPredictions(userId);
  // FR-REFINE-30.1: hide already-played days by default so today lands at the top.
  // Cut by UTC calendar day to align with groupFixtureByDay.
  const today = new Date().toISOString().slice(0, 10);
  const { pastDays, currentDays } = partitionDaysByToday(fixture?.days ?? [], today);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">{dictionary.pages.matchesEyebrow}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{dictionary.pages.matchesTitle}</h1>
          <p className="text-muted-foreground">{dictionary.pages.matchesDescription}</p>
        </div>
        <Link className={buttonVariants({ variant: "outline" })} href="/pools">
          {dictionary.pools.myPools}
        </Link>
      </header>

      {!fixture ? (
        <section className="rounded-xl border p-8 text-center" data-testid="fixture-empty">
          <h2 className="font-semibold">{dictionary.pages.matchesEmptyTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {dictionary.pages.matchesEmptyDescription}
          </p>
        </section>
      ) : (
        // Matches are listed in order of occurrence, grouped by day (FR-REFINE-16.2).
        // Past days collapse behind a toggle so today stays at the top (FR-REFINE-30.x).
        <MatchesFixtureView pastDays={pastDays} currentDays={currentDays} />
      )}
    </main>
  );
}
