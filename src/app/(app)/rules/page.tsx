import type { Metadata } from "next";
import { CalculatorErrorBoundary } from "@/features/education/components/calculator-error-boundary";
import { RulesAccordion } from "@/features/education/components/rules-accordion";
import { RulesHeader } from "@/features/education/components/rules-header";
import { ScoreBreakdownDemo } from "@/features/education/components/score-breakdown-demo";
import { ScoringCalculator } from "@/features/education/components/scoring-calculator";
import { es } from "@/i18n/dictionaries/es";
import { getFullRules } from "@/lib/rules-content";

export const metadata: Metadata = {
  title: es.rules.centerTitle,
};

export default function RulesPage() {
  const sections = getFullRules().map((doc) => ({
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
