import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { FixtureStaleBanner } from "@/features/competition/components/fixture-stale-banner";
import { PhaseSection } from "@/features/competition/components/phase-section";
import { getFixture } from "@/features/competition/queries";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const fixture = await getFixture();

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Fixture</p>
          <h1 className="text-3xl font-semibold tracking-tight">Partidos del Mundial</h1>
          <p className="text-muted-foreground">Horarios mostrados en tu hora local.</p>
        </div>
        <Link className={buttonVariants({ variant: "outline" })} href="/pools">
          Mis pools
        </Link>
      </header>

      {!fixture ? (
        <section className="rounded-xl border p-8 text-center" data-testid="fixture-empty">
          <h2 className="font-semibold">Fixture no disponible</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ejecuta el seed de competición para cargar los datos iniciales.
          </p>
        </section>
      ) : (
        <>
          <FixtureStaleBanner freshness={fixture.freshness} />
          <div className="space-y-8" data-testid="fixture-ready">
            {fixture.phases.map((phase) => (
              <PhaseSection key={phase.id} phase={phase} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
