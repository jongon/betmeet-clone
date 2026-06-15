"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScoringTable } from "@/features/education/components/scoring-table";
import { useDictionary } from "@/i18n/dictionary-provider";

interface RulesStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Educational onboarding step (BL-4). Skippable: both actions advance to the
 * passkey step; it never blocks completion (BR-2.21, BR-2.23) and persists no
 * "rules seen" state (BR-2.22).
 */
export function RulesStep({ onComplete, onSkip }: RulesStepProps) {
  const dictionary = useDictionary();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="size-6 text-muted-foreground" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-semibold">{dictionary.onboarding.rulesStepTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {dictionary.onboarding.rulesStepDescription}
          </p>
        </div>
      </div>

      <ScoringTable />

      <Link
        href="/rules"
        className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        data-testid="rules-step-link"
      >
        {dictionary.onboarding.rulesStepLink}
      </Link>

      <div className="space-y-2">
        <Button className="w-full" onClick={onComplete} data-testid="rules-step-continue">
          {dictionary.common.continue}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onSkip} data-testid="rules-step-skip">
          {dictionary.common.skipForNow}
        </Button>
      </div>
    </div>
  );
}
