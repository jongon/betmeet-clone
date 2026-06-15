"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/dictionary-provider";
import { sanitizeNext } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/client";
import { reportPasskeyFailure } from "../actions/passkey-sign-in";

export function PasskeySignInButton({ next }: { next?: string }) {
  const t = useDictionary().auth;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePasskeySignIn() {
    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      // signInWithPasskey() maneja toda la ceremonia WebAuthn con credenciales
      // descubribles: no requiere email ni listar factores previamente.
      const { error: signInError } = await supabase.auth.signInWithPasskey();

      if (signInError) {
        await reportPasskeyFailure(signInError.message);
        setError(signInError.message);
        setPending(false);
        return;
      }

      // Return to the intended destination preserved through sign-in (FR-REFINE-13.1).
      window.location.href = sanitizeNext(next, "/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.passkeyFailure;
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
        {pending ? t.passkeyVerifying : t.passkeySignIn}
      </Button>
      {error && (
        <p id="passkey-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
