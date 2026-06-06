"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { AcceptDialog } from "@/components/admin/accept-dialog";
import { RejectSessionButton } from "@/components/admin/reject-session-button";
import { Button } from "@/components/ui/button";

export function SessionDecisionActions({
  sessionId,
  cambiadorName,
  compact = false,
  acceptRedirectTo,
}: {
  sessionId: string;
  cambiadorName: string;
  compact?: boolean;
  acceptRedirectTo?: string;
}) {
  if (compact) {
    return (
      <>
        <RejectSessionButton
          sessionId={sessionId}
          cambiadorName={cambiadorName}
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <XIcon />
        </RejectSessionButton>
        <AcceptDialog sessionId={sessionId} cambiadorName={cambiadorName}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Aceptar sesión de ${cambiadorName}`}
            className="text-primary hover:bg-primary/10 hover:text-primary"
          >
            <CheckIcon />
          </Button>
        </AcceptDialog>
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <RejectSessionButton sessionId={sessionId} cambiadorName={cambiadorName} variant="outline">
        <XIcon />
        Rechazar
      </RejectSessionButton>
      <AcceptDialog
        sessionId={sessionId}
        cambiadorName={cambiadorName}
        redirectTo={acceptRedirectTo}
      >
        <Button type="button">
          <CheckIcon />
          Aprobar propuesta
        </Button>
      </AcceptDialog>
    </div>
  );
}
