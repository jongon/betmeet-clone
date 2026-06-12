"use client";

import { useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleVerify() {
    if (code.length !== 6) {
      setError("Code must be 6 digits");
      return;
    }
    setPending(true);
    const result = await verifyMfa(factorId, code, next);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
    // On success, verifyMfa redirects — no need to handle
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
