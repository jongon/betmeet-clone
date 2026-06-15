"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/dictionary-provider";
import { createClient } from "@/lib/supabase/client";

interface PasskeyStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function PasskeyStep({ onComplete, onSkip }: PasskeyStepProps) {
  const dictionary = useDictionary();
  const t = dictionary.onboarding;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function handleRegister() {
    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      // registerPasskey() ejecuta la ceremonia WebAuthn completa (challenge →
      // navigator.credentials.create → verify) contra el RP configurado en el
      // dashboard. Requiere sesión activa, que ya existe en el onboarding.
      const { error: registerError } = await supabase.auth.registerPasskey();

      if (registerError) {
        setError(registerError.message);
      } else {
        setRegistered(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.passkeyFailure);
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
          <h2 className="text-xl font-semibold">{t.passkeyRegisteredTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.passkeyRegisteredDescription}</p>
        </div>
        <Button className="w-full" onClick={onComplete}>
          {t.passkeyFinish}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t.passkeyTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.passkeyDescription}</p>
      </div>

      <div className="flex justify-center">
        <KeyRound className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
      </div>

      <FormError messages={error ? [error] : undefined} />

      <div className="space-y-2">
        <Button className="w-full" disabled={pending} onClick={handleRegister}>
          {pending ? t.passkeySettingUp : t.passkeyRegister}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onSkip}>
          {dictionary.common.skipForNow}
        </Button>
      </div>
    </div>
  );
}
