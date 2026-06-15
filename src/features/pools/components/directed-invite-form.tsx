"use client";

import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDictionary } from "@/i18n/dictionary-provider";
import { createDirectedInvite } from "../actions/create-directed-invite";

export function DirectedInviteForm({ poolId }: { poolId: string }) {
  const t = useDictionary().pools;
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createDirectedInvite({ poolId, target });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setTarget("");
      setMessage(result?.pushQueued ? t.inviteSentPush : t.inviteSaved);
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4" data-testid="directed-invite-form">
      <div>
        <p className="font-medium">{t.inviteByNickname}</p>
        <p className="text-sm text-muted-foreground">{t.inviteDescription}</p>
      </div>
      <FormError messages={error ? [error] : undefined} />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <div className="flex gap-2">
        <Input
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder={t.invitePlaceholder}
          aria-label={t.inviteAria}
        />
        <Button type="button" disabled={pending || target.trim().length < 3} onClick={submit}>
          {t.inviteSubmit}
        </Button>
      </div>
    </div>
  );
}
