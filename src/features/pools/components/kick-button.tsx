"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/dictionary-provider";
import { kickMember } from "../actions/kick-member";

export function KickButton({ poolId, userId }: { poolId: string; userId: string }) {
  const t = useDictionary().pools;
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function kick() {
    setMessage(null);
    startTransition(async () => {
      const result = await kickMember(poolId, userId);
      if (result?.error) setMessage(result.error);
    });
  }

  return (
    <div className="space-y-1 text-right">
      <Button
        variant="destructive"
        size="sm"
        onClick={kick}
        disabled={pending}
        data-testid={`kick-member-${userId}`}
      >
        {pending ? t.kicking : t.kick}
      </Button>
      {message && <p className="text-xs text-destructive">{message}</p>}
    </div>
  );
}
