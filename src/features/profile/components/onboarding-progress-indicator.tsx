"use client";

import { useDictionary } from "@/i18n/dictionary-provider";
import { cn } from "@/lib/utils";

const STEPS = [
  { labelKey: "stepNickname", key: "nickname" },
  { labelKey: "stepAvatar", key: "avatar" },
  { labelKey: "stepRules", key: "rules" },
  { labelKey: "stepPasskey", key: "passkey" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

interface OnboardingProgressIndicatorProps {
  currentStep: StepKey;
}

export function OnboardingProgressIndicator({ currentStep }: OnboardingProgressIndicatorProps) {
  const t = useDictionary().onboarding;
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <nav aria-label={t.progress} className="flex items-center justify-center gap-2">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn("h-px w-8", isComplete ? "bg-primary" : "bg-muted-foreground/30")}
                aria-hidden="true"
              />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium",
                  isComplete && "bg-primary text-primary-foreground",
                  isCurrent && "border-2 border-primary text-primary",
                  !isComplete &&
                    !isCurrent &&
                    "border-2 border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {isComplete ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {t[step.labelKey]}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
