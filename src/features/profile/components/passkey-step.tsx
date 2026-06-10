"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import {
  startPasskeyRegistration,
  verifyPasskeyRegistration,
} from "@/features/auth/actions/passkey-register";

interface PasskeyStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function PasskeyStep({ onComplete, onSkip }: PasskeyStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function handleRegister() {
    setPending(true);
    setError(null);

    const result = await startPasskeyRegistration();
    if ("error" in result) {
      setError(result.error ?? "Failed to start passkey registration");
      setPending(false);
      return;
    }

    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const credential = await startRegistration(result.creationOptions as never);
      const verifyResult = await verifyPasskeyRegistration(
        (result.creationOptions as { id: string }).id,
        credential,
      );

      if (verifyResult?.error) {
        setError(verifyResult.error);
      } else {
        setRegistered(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey registration failed");
    }

    setPending(false);
  }

  if (registered) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <ShieldCheck className="h-16 w-16 text-green-500" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Passkey registered!</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You can now sign in with your device biometrics.
          </p>
        </div>
        <Button className="w-full" onClick={onComplete}>
          Finish setup
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Add a passkey</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in faster and more securely using your device&apos;s biometrics or PIN.
        </p>
      </div>

      <div className="flex justify-center">
        <KeyRound className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
      </div>

      <FormError messages={error ? [error] : undefined} />

      <div className="space-y-2">
        <Button className="w-full" disabled={pending} onClick={handleRegister}>
          {pending ? "Setting up…" : "Register passkey"}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
