import type { Metadata } from "next";
import { BrandToggle } from "@/components/theme/brand-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { IslandBoundary } from "@/features/education/components/island-boundary";
import { LandingHero } from "@/features/education/components/landing-hero";
import { LandingSecondaryCtas } from "@/features/education/components/landing-secondary-ctas";
import { PoolPreview } from "@/features/education/components/pool-preview";
import { ScoringTeaser } from "@/features/education/components/scoring-teaser";
import { listPublicPools } from "@/features/pools/queries";
import { es } from "@/i18n/dictionaries/es";

export const metadata: Metadata = {
  title: es.common.appName,
  description: es.landing.heroSubtitle,
  openGraph: {
    title: es.common.appName,
    description: es.landing.heroSubtitle,
    type: "website",
  },
};

export default async function Home() {
  const pools = await listPublicPools({ onlyWithCapacity: true }).catch(() => null);

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      <div className="flex justify-end gap-1 pt-4">
        <BrandToggle />
        <ThemeToggle />
      </div>

      <LandingHero />

      <div className="space-y-12">
        <ScoringTeaser />

        {/* PoolPreview hides itself on error (BR-2.26). */}
        <IslandBoundary>
          <PoolPreview
            pools={pools?.slice(0, 4)}
            state={pools === null ? "error" : pools.length > 0 ? "ready" : "empty"}
          />
        </IslandBoundary>

        <LandingSecondaryCtas />
      </div>
    </main>
  );
}
