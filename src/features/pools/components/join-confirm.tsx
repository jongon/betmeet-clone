"use client";

import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/dictionary-provider";
import { joinPoolByToken } from "../actions/join-pool-by-token";

export function JoinConfirm({ token }: { token: string }) {
  const t = useDictionary().pools;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function join() {
    setError(null);
    startTransition(async () => {
      const result = await joinPoolByToken(token);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-4 rounded-xl border p-6" data-testid="join-confirm">
      <div>
        <p className="text-sm text-muted-foreground">{t.inviteCodeTitle}</p>
        <p className="font-mono text-lg font-semibold">{token}</p>
      </div>
      <FormError messages={error ? [error] : undefined} />
      <Button onClick={join} disabled={pending}>
        {pending ? t.joining : t.joinPool}
      </Button>
    </div>
  );
}
