"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AvatarStep } from "@/features/profile/components/avatar-step";
import { NicknameStep } from "@/features/profile/components/nickname-step";
import { OnboardingProgressIndicator } from "@/features/profile/components/onboarding-progress-indicator";
import { PasskeyStep } from "@/features/profile/components/passkey-step";
import { RulesStep } from "@/features/profile/components/rules-step";
import type { AvatarAsset } from "@/features/profile/types";

type Step = "nickname" | "avatar" | "rules" | "passkey";

interface OnboardingClientProps {
  currentAvatarUrl: string;
  defaultAvatars: AvatarAsset[];
  googleAvatarUrl: string | null;
}

export function OnboardingClient({
  currentAvatarUrl,
  defaultAvatars,
  googleAvatarUrl,
}: OnboardingClientProps) {
  const [step, setStep] = useState<Step>("nickname");
  const [avatarUrl] = useState(currentAvatarUrl);
  const router = useRouter();

  return (
    <div className="space-y-8">
      <OnboardingProgressIndicator currentStep={step} />

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
        <RulesStep onComplete={() => setStep("passkey")} onSkip={() => setStep("passkey")} />
      )}

      {step === "passkey" && (
        <PasskeyStep
          onComplete={() => router.push("/matches")}
          onSkip={() => router.push("/matches")}
        />
      )}
    </div>
  );
}
