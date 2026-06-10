"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { reportPasskeyFailure } from "../actions/passkey-sign-in";

export function PasskeySignInButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePasskeySignIn() {
    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError || !factorsData?.webauthn?.length) {
        setError("No passkey registered on this account");
        setPending(false);
        return;
      }

      const factor = factorsData.webauthn[0];
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });

      if (challengeError) {
        await reportPasskeyFailure(challengeError.message);
        setError("Passkey challenge failed");
        setPending(false);
        return;
      }

      const { startAuthentication } = await import("@simplewebauthn/browser");
      const credential = await startAuthentication({
        optionsJSON: challengeData as never,
      });

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challengeData.id,
        code: JSON.stringify(credential),
      });

      if (verifyError) {
        await reportPasskeyFailure(verifyError.message);
        setError("Passkey verification failed");
        setPending(false);
        return;
      }

      window.location.href = "/";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Passkey sign-in failed";
      await reportPasskeyFailure(msg);
      setError(msg);
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={handlePasskeySignIn}
        aria-describedby={error ? "passkey-error" : undefined}
      >
        <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
        {pending ? "Verifying…" : "Sign in with passkey"}
      </Button>
      {error && (
        <p id="passkey-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
