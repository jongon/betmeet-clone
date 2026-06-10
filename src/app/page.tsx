import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { IslandBoundary } from "@/features/education/components/island-boundary";
import { LandingHero } from "@/features/education/components/landing-hero";
import { LandingSecondaryCtas } from "@/features/education/components/landing-secondary-ctas";
import { PoolPreview } from "@/features/education/components/pool-preview";
import { ScoringTeaser } from "@/features/education/components/scoring-teaser";
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

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      <div className="flex justify-end pt-4">
        <ThemeToggle />
      </div>

      <LandingHero />

      <div className="space-y-12">
        <ScoringTeaser />

        {/* PoolPreview hides itself on error (BR-2.26); data arrives in Unit 3. */}
        <IslandBoundary>
          <PoolPreview state="empty" />
        </IslandBoundary>

        <LandingSecondaryCtas />
      </div>
    </main>
  );
}
