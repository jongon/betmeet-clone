"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/dictionary-provider";
import { revertMatchOverride } from "../actions/revert-override";

export function RevertOverrideButton({ matchId }: { matchId: string }) {
  const t = useDictionary().admin;
  const [pending, setPending] = useState(false);

  async function handleRevert() {
    setPending(true);
    await revertMatchOverride(matchId);
    setPending(false);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRevert}
      disabled={pending}
      data-testid={`revert-override-${matchId}`}
    >
      {pending ? t.reverting : t.revertToApi}
    </Button>
  );
}
