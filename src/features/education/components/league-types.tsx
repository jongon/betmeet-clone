import { Check, Globe, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

/**
 * Public vs. private leagues section. Explains the two pool types the user asked
 * to surface on the landing — directory-listed public pools and invite-only
 * private pools (BR-67.3). Server component; copy from the dictionary.
 */
export async function LeagueTypes() {
  const dictionary = getDictionary(await getRequestLocale());
  const { leagues } = dictionary.landing;

  const cards = [
    { kind: "public" as const, icon: Globe, ...leagues.public },
    { kind: "private" as const, icon: Lock, ...leagues.private },
  ];

  return (
    <section id="leagues" className="scroll-mt-20 space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{leagues.title}</h2>
        <p className="mx-auto max-w-xl text-balance text-muted-foreground">{leagues.subtitle}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map(({ kind, icon: Icon, badge, title, description, features }) => (
          <Card key={kind} className="h-full">
            <CardHeader>
              <CardAction className="flex items-center gap-2">
                <Badge variant="brand">{badge}</Badge>
              </CardAction>
              <div className="flex items-center gap-2">
                <Icon className="size-5 text-brand" aria-hidden="true" />
                <CardTitle>{title}</CardTitle>
              </div>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
