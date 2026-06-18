"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/features/profile/actions/complete-onboarding";
import { AvatarStep } from "@/features/profile/components/avatar-step";
import { NicknameStep } from "@/features/profile/components/nickname-step";
import { NotificationStep } from "@/features/profile/components/notification-step";
import { OnboardingProgressIndicator } from "@/features/profile/components/onboarding-progress-indicator";
import { PasskeyStep } from "@/features/profile/components/passkey-step";
import { RulesStep } from "@/features/profile/components/rules-step";
import type { AvatarAsset } from "@/features/profile/types";
import { useDictionary } from "@/i18n/dictionary-provider";

type Step = "nickname" | "avatar" | "rules" | "notifications" | "passkey";

// Linear order of the onboarding steps; drives back navigation (FR-REFINE-16.3).
const STEP_ORDER: Step[] = ["nickname", "avatar", "rules", "notifications", "passkey"];

interface OnboardingClientProps {
  currentAvatarUrl: string;
  defaultAvatars: AvatarAsset[];
  googleAvatarUrl: string | null;
  /** Destination to continue to once onboarding finishes (FR-REFINE-12.7). */
  next?: string;
}

export function OnboardingClient({
  currentAvatarUrl,
  defaultAvatars,
  googleAvatarUrl,
  next = "/matches",
}: OnboardingClientProps) {
  const { common } = useDictionary();
  const [step, setStep] = useState<Step>("nickname");
  const [avatarUrl] = useState(currentAvatarUrl);
  const [finishError, setFinishError] = useState<string | null>(null);
  const router = useRouter();

  const stepIndex = STEP_ORDER.indexOf(step);
  const canGoBack = stepIndex > 0;

  function goBack() {
    if (canGoBack) setStep(STEP_ORDER[stepIndex - 1]);
  }

  async function finishOnboarding() {
    setFinishError(null);
    const result = await completeOnboarding();
    if (result.error) {
      setFinishError(result.error);
      return;
    }
    router.push(next);
  }

  return (
    <div className="space-y-8">
      <OnboardingProgressIndicator currentStep={step} />

      {canGoBack && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
          data-testid="onboarding-back"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {common.back}
        </Button>
      )}

      <FormError messages={finishError ? [finishError] : undefined} />

      {step === "nickname" && <NicknameStep onComplete={() => setStep("avatar")} />}

      {step === "avatar" && (
        <AvatarStep
          defaultAvatars={defaultAvatars}
          currentAvatarUrl={avatarUrl}
          googleAvatarUrl={googleAvatarUrl}
          onComplete={() => setStep("rules")}
        />
      )}

      {step === "rules" && (
        <RulesStep
          onComplete={() => setStep("notifications")}
          onSkip={() => setStep("notifications")}
        />
      )}

      {step === "notifications" && (
        <NotificationStep onComplete={() => setStep("passkey")} onSkip={() => setStep("passkey")} />
      )}

      {step === "passkey" && (
        <PasskeyStep onComplete={finishOnboarding} onSkip={finishOnboarding} />
      )}
    </div>
  );
}
