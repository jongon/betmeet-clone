"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDictionary } from "@/i18n/dictionary-provider";
import { revertMatchOverride } from "../actions/revert-override";

export function RevertOverrideButton({ matchId }: { matchId: string }) {
  const t = useDictionary().admin;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleRevert() {
    setPending(true);
    await revertMatchOverride(matchId);
    setPending(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" />}
        data-testid={`revert-override-${matchId}`}
      >
        {t.revertToApi}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.revertConfirmTitle}</DialogTitle>
          <DialogDescription>{t.revertConfirmBody}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {t.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevert}
            disabled={pending}
            data-testid={`revert-override-confirm-${matchId}`}
          >
            {pending ? t.reverting : t.revertConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
