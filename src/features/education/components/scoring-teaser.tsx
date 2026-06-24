import { MDXContent } from "@content-collections/mdx/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";
import { getTeaserRules } from "@/lib/rules-content";
import { ScoreBreakdownDemo } from "./score-breakdown-demo";
import { ScoringTable } from "./scoring-table";

/**
 * The only rules content shown publicly on the landing (BR-2.9): a compact
 * scoring summary. Renders the teaser MDX, the canonical scoring table and a
 * set of worked examples computed with the real engine (BR-67.8).
 */
export async function ScoringTeaser() {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  const [teaser] = getTeaserRules(locale);

  return (
    <Card data-testid="scoring-teaser">
      <CardHeader>
        <CardTitle>{dictionary.landing.scoringTeaserTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {teaser && (
          <div className="text-sm text-muted-foreground [&_strong]:text-foreground">
            <MDXContent code={teaser.body} />
          </div>
        )}
        <ScoringTable />
        <ScoreBreakdownDemo />
      </CardContent>
    </Card>
  );
}
