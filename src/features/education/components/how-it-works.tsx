import type { LucideIcon } from "lucide-react";
import { PencilLine, TrendingUp, Trophy, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

// Icons are paired positionally with `landing.howItWorks.steps` (FR-REFINE-67.1).
const STEP_ICONS: readonly LucideIcon[] = [Users, PencilLine, Trophy, TrendingUp];

/**
 * "How it works" marketing section: the four-step path from creating a league
 * to climbing the ranking. Server component; copy from the dictionary (BR-67.2).
 */
export async function HowItWorks() {
  const dictionary = getDictionary(await getRequestLocale());
  const { howItWorks } = dictionary.landing;

  return (
    <section id="how-it-works" className="scroll-mt-20 space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{howItWorks.title}</h2>
        <p className="mx-auto max-w-xl text-balance text-muted-foreground">{howItWorks.subtitle}</p>
      </div>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {howItWorks.steps.map((step, index) => {
          const Icon = STEP_ICONS[index] ?? Users;
          return (
            <li key={step.title}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand">
                      {index + 1}
                    </span>
                    <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
