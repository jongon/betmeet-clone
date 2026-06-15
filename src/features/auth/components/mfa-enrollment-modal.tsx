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
import { useDictionary } from "@/i18n/dictionary-provider";
import { confirmMfaEnrollment, enrollMfa } from "../actions/mfa-enroll";

interface MFAEnrollmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "loading" | "error" | "scan" | "verify" | "done";

export function MFAEnrollmentModal({ open, onClose, onSuccess }: MFAEnrollmentModalProps) {
  const t = useDictionary().auth;
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
        setError(result.error ?? t.mfaEnrollStartFailed);
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
  }, [open, t.mfaEnrollStartFailed]);

  async function handleVerify() {
    if (code.length !== 6) {
      setError(t.mfaCodeLength);
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
          <DialogTitle>{t.mfaEnrollTitle}</DialogTitle>
          <DialogDescription>{t.mfaEnrollDescription}</DialogDescription>
        </DialogHeader>

        {step === "loading" && <p className="text-sm text-muted-foreground">{t.submitting}</p>}

        {step === "error" && (
          <div className="space-y-4">
            <FormError messages={error ? [error] : [t.mfaEnrollStartFailed]} />
            <Button variant="outline" className="w-full" onClick={onClose}>
              {t.close}
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
              <img src={qrCode} alt={t.mfaQrAlt} width={192} height={192} className="h-48 w-48" />
            </div>
            <p className="text-center text-xs text-muted-foreground break-all">
              {t.mfaManualEntry} <span className="font-mono">{secret}</span>
            </p>
            <Button className="w-full" onClick={() => setStep("verify")}>
              {t.mfaScanned}
            </Button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <FormError messages={error ? [error] : undefined} />
            <div className="space-y-1.5">
              <Label htmlFor="totp-code">{t.mfaCode}</Label>
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
              {pending ? t.mfaVerifying : t.mfaEnable}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
