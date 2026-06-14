"use client";

import { startTransition, useActionState, useState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyMfa } from "../actions/mfa-verify";

interface MFAPromptModalProps {
  factorId: string;
  open: boolean;
  next?: string;
  onClose: () => void;
}

export function MFAPromptModal({ factorId, open, next, onClose }: MFAPromptModalProps) {
  const [code, setCode] = useState("");
  // verifyMfa redirects on success. A server action's redirect() only propagates
  // when dispatched inside a transition (same reason sign-in-form wraps its
  // action) — otherwise it surfaces as an unhandled "unexpected response"
  // rejection. useActionState handles both the redirect and the returned error.
  const [state, formAction, pending] = useActionState<{ error?: string } | undefined, string>(
    async (_prev, value) => {
      if (value.length !== 6) return { error: "Code must be 6 digits" };
      return verifyMfa(factorId, value, next);
    },
    undefined,
  );
  const error = state?.error ?? null;

  function handleVerify() {
    startTransition(() => formAction(code));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Two-factor authentication</DialogTitle>
          <DialogDescription>Enter the 6-digit code from your authenticator app.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormError messages={error ? [error] : undefined} />

          <div className="space-y-1.5">
            <Label htmlFor="mfa-code">Authentication code</Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              aria-describedby={error ? "mfa-error" : undefined}
            />
          </div>

          <Button className="w-full" disabled={pending} onClick={handleVerify}>
            {pending ? "Verifying…" : "Verify"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
