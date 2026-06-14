"use client";

import { useEffect, useState } from "react";
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
import { confirmMfaEnrollment, enrollMfa } from "../actions/mfa-enroll";

interface MFAEnrollmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "loading" | "error" | "scan" | "verify" | "done";

export function MFAEnrollmentModal({ open, onClose, onSuccess }: MFAEnrollmentModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // The modal is opened in a controlled way from the parent, so the Dialog's
  // `onOpenChange` never fires on open. Trigger the enroll from an effect that
  // watches `open`. The parent remounts this component (via `key`) on each open,
  // so state resets to its defaults without setting state synchronously here.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    enrollMfa().then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setError(result.error ?? "Failed to start enrollment");
        setStep("error");
        return;
      }
      setFactorId(result.factorId);
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setStep("scan");
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleVerify() {
    if (code.length !== 6) {
      setError("Code must be 6 digits");
      return;
    }
    setPending(true);
    const result = await confirmMfaEnrollment(factorId, code);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    } else {
      setStep("done");
      onSuccess();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable two-factor authentication</DialogTitle>
          <DialogDescription>
            Scan the QR code with your authenticator app, then enter the code to confirm.
          </DialogDescription>
        </DialogHeader>

        {step === "loading" && <p className="text-sm text-muted-foreground">Loading…</p>}

        {step === "error" && (
          <div className="space-y-4">
            <FormError messages={error ? [error] : ["Failed to start enrollment"]} />
            <Button variant="outline" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        )}

        {step === "scan" && (
          <div className="space-y-4">
            <FormError messages={error ? [error] : undefined} />
            <div className="flex justify-center">
              {/* Supabase returns the QR as an unencoded SVG data URI, which
                  next/image cannot parse — use a plain img (no optimization
                  applies to a data URI anyway). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="TOTP QR code" width={192} height={192} className="h-48 w-48" />
            </div>
            <p className="text-center text-xs text-muted-foreground break-all">
              Manual entry: <span className="font-mono">{secret}</span>
            </p>
            <Button className="w-full" onClick={() => setStep("verify")}>
              I&apos;ve scanned the code
            </Button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <FormError messages={error ? [error] : undefined} />
            <div className="space-y-1.5">
              <Label htmlFor="totp-code">Authentication code</Label>
              <Input
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <Button className="w-full" disabled={pending} onClick={handleVerify}>
              {pending ? "Verifying…" : "Enable 2FA"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
