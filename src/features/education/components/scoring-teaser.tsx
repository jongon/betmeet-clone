import { MDXContent } from "@content-collections/mdx/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { es } from "@/i18n/dictionaries/es";
import { getTeaserRules } from "@/lib/rules-content";
import { ScoringTable } from "./scoring-table";

/**
 * The only rules content shown publicly on the landing (BR-2.9): a compact
 * scoring summary. Renders the teaser MDX plus the canonical scoring table.
 */
export function ScoringTeaser() {
  const [teaser] = getTeaserRules();

  return (
    <Card data-testid="scoring-teaser">
      <CardHeader>
        <CardTitle>{es.landing.scoringTeaserTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {teaser && (
          <div className="text-sm text-muted-foreground [&_strong]:text-foreground">
            <MDXContent code={teaser.body} />
          </div>
        )}
        <ScoringTable />
      </CardContent>
    </Card>
  );
}
