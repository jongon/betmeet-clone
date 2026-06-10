"use client";

import Image from "next/image";
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
import { confirmMfaEnrollment, enrollMfa } from "../actions/mfa-enroll";

interface MFAEnrollmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "loading" | "scan" | "verify" | "done";

export function MFAEnrollmentModal({ open, onClose, onSuccess }: MFAEnrollmentModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleOpen(isOpen: boolean) {
    if (isOpen && step === "loading") {
      const result = await enrollMfa();
      if ("error" in result) {
        setError(result.error ?? "Failed to start enrollment");
        return;
      }
      setFactorId(result.factorId);
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setStep("scan");
    } else if (!isOpen) {
      onClose();
    }
  }

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
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable two-factor authentication</DialogTitle>
          <DialogDescription>
            Scan the QR code with your authenticator app, then enter the code to confirm.
          </DialogDescription>
        </DialogHeader>

        {step === "loading" && <p className="text-sm text-muted-foreground">Loading…</p>}

        {step === "scan" && (
          <div className="space-y-4">
            <FormError messages={error ? [error] : undefined} />
            <div className="flex justify-center">
              <Image
                src={qrCode}
                alt="TOTP QR code"
                width={192}
                height={192}
                className="h-48 w-48"
                unoptimized
              />
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
