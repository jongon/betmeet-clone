import type { LucideIcon } from "lucide-react";
import { Activity, BookOpen, Mail, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

// Icons paired positionally with `landing.features.items` (FR-REFINE-67.1).
const FEATURE_ICONS: readonly LucideIcon[] = [Mail, BookOpen, Activity, Scale];

/**
 * Feature grid summarizing what the product offers (invites, rules, live
 * ranking, fair scoring). Server component; copy from the dictionary (BR-67.4).
 */
export async function FeatureGrid() {
  const dictionary = getDictionary(await getRequestLocale());
  const { features } = dictionary.landing;

  return (
    <section className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{features.title}</h2>
        <p className="mx-auto max-w-xl text-balance text-muted-foreground">{features.subtitle}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.items.map((item, index) => {
          const Icon = FEATURE_ICONS[index] ?? Mail;
          return (
            <Card key={item.title} className="h-full">
              <CardContent className="flex h-full flex-col gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-brand/15 text-brand">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="font-medium">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
