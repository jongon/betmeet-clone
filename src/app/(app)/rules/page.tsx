import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { CalculatorErrorBoundary } from "@/features/education/components/calculator-error-boundary";
import { RulesAccordion } from "@/features/education/components/rules-accordion";
import { RulesHeader } from "@/features/education/components/rules-header";
import { ScoreBreakdownDemo } from "@/features/education/components/score-breakdown-demo";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";
import { getFullRules } from "@/lib/rules-content";

const ScoringCalculator = dynamic(() =>
  import("@/features/education/components/scoring-calculator").then((m) => ({
    default: m.ScoringCalculator,
  })),
);

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getRequestLocale());
  return { title: dictionary.rules.centerTitle };
}

export default async function RulesPage() {
  const locale = await getRequestLocale();
  const sections = getFullRules(locale).map((doc) => ({
    slug: doc.slug,
    title: doc.title,
    body: doc.body,
  }));

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <RulesHeader />

      <RulesAccordion sections={sections} />

      <CalculatorErrorBoundary>
        <ScoringCalculator />
      </CalculatorErrorBoundary>

      <ScoreBreakdownDemo />
    </main>
  );
}
