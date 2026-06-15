"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { disableMfa } from "@/features/auth/actions/mfa-disable";
import { ConfirmDeleteModal } from "@/features/auth/components/confirm-delete-modal";
import { MFAEnrollmentModal } from "@/features/auth/components/mfa-enrollment-modal";
import { useDictionary } from "@/i18n/dictionary-provider";

interface TotpFactor {
  id: string;
  friendlyName: string;
}

interface SecuritySettingsClientProps {
  mfaEnabled: boolean;
  totpFactors: TotpFactor[];
}

export function SecuritySettingsClient({ mfaEnabled, totpFactors }: SecuritySettingsClientProps) {
  const t = useDictionary().settings;
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [factors, setFactors] = useState(totpFactors);
  const [isMfaEnabled, setIsMfaEnabled] = useState(mfaEnabled);

  async function handleDisableMfa(factorId: string) {
    const result = await disableMfa(factorId);
    if (result.error) {
      toast.error(result.error);
    } else {
      setFactors((prev) => prev.filter((f) => f.id !== factorId));
      if (factors.length <= 1) setIsMfaEnabled(false);
      toast.success(t.twoFactorDisabled);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t.twoFactorTitle}</CardTitle>
              <CardDescription>{t.twoFactorDescription}</CardDescription>
            </div>
            <Badge variant={isMfaEnabled ? "default" : "secondary"}>
              {isMfaEnabled ? t.enabled : t.disabled}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {factors.map((factor) => (
            <div
              key={factor.id}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <span className="text-sm">{factor.friendlyName}</span>
              <Button variant="destructive" size="sm" onClick={() => handleDisableMfa(factor.id)}>
                {t.remove}
              </Button>
            </div>
          ))}

          <Button variant="outline" onClick={() => setEnrollOpen(true)}>
            {t.addAuthenticator}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">{t.dangerZone}</CardTitle>
          <CardDescription>{t.dangerDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            {t.deleteAccount}
          </Button>
        </CardContent>
      </Card>

      <MFAEnrollmentModal
        key={String(enrollOpen)}
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        onSuccess={() => {
          setIsMfaEnabled(true);
          setEnrollOpen(false);
          toast.success(t.twoFactorEnabled);
        }}
      />

      <ConfirmDeleteModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}
