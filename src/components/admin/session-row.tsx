"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useTransition } from "react";
import { rejectSession } from "@/app/admin/actions";
import { AcceptDialog } from "@/components/admin/accept-dialog";
import { ViewSessionQrButton } from "@/components/admin/view-session-qr-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Session } from "@/lib/sessions";

const dateFormatter = new Intl.DateTimeFormat("es", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function SessionRow({ session }: { session: Session }) {
  const [isPending, startTransition] = useTransition();
  const isOpen = session.status === "open";
  const hasToken = session.token.length > 0;

  const onReject = () => {
    startTransition(() => {
      void rejectSession(session.id);
    });
  };

  const rowClass = isOpen
    ? "rounded-xl border border-primary/20 bg-primary/5 p-4 transition-colors"
    : "rounded-xl border border-border bg-muted p-4 text-muted-foreground";

  return (
    <li className={rowClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p
              className={`truncate font-medium ${isOpen ? "text-foreground" : "text-muted-foreground"}`}
            >
              {session.cambiadorName}
            </p>
            {isOpen ? (
              <Badge variant="default" className="bg-brand text-brand-foreground">
                Abierta
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                Cerrada
              </Badge>
            )}
          </div>
          <p className="text-sm">
            Ofrece <span className="font-semibold text-foreground">{session.offeredCount}</span> ·
            Te pide <span className="font-semibold text-foreground">{session.requestedCount}</span>
          </p>
          <p className="text-xs" suppressHydrationWarning>
            {formatDate(session.createdAt)}
          </p>
        </div>

        {isOpen ? (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {hasToken ? (
              <ViewSessionQrButton
                token={session.token}
                cambiadorName={session.cambiadorName}
                sessionCreatedAt={session.createdAt}
              />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onReject}
              disabled={isPending}
              aria-label={`Rechazar sesión de ${session.cambiadorName}`}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <XIcon />
            </Button>
            <AcceptDialog sessionId={session.id} cambiadorName={session.cambiadorName}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                aria-label={`Aceptar sesión de ${session.cambiadorName}`}
                className="text-primary hover:bg-primary/10 hover:text-primary"
              >
                <CheckIcon />
              </Button>
            </AcceptDialog>
          </div>
        ) : null}
      </div>
    </li>
  );
}
