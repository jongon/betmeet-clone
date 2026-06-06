"use client";

import { ArchiveIcon, CheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { archiveSession } from "@/app/admin/actions";
import { AcceptDialog } from "@/components/admin/accept-dialog";
import { RejectSessionButton } from "@/components/admin/reject-session-button";
import { SessionStatusBadge } from "@/components/admin/session-status-badge";
import { ViewSessionQrButton } from "@/components/admin/view-session-qr-button";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buildAdminSessionDetailPath, formatAdminSessionDate } from "@/lib/admin-session-detail";
import type { Session } from "@/lib/sessions";

export function SessionRow({
  session,
  allowArchive = false,
}: {
  session: Session;
  allowArchive?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const isOpen = session.status === "open";
  const hasToken = session.token.length > 0;
  const canArchive = allowArchive && session.status === "closed" && !session.archivedAt;

  const onArchive = () => {
    startTransition(() => {
      void archiveSession(session.id);
    });
  };

  const rowClass = isOpen
    ? "rounded-xl border border-chart-4/35 bg-chart-4/8 p-4 transition-colors"
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
            <SessionStatusBadge session={session} />
          </div>
          <p className="text-sm">
            Ofrece <span className="font-semibold text-foreground">{session.offeredCount}</span> ·
            Te pide <span className="font-semibold text-foreground">{session.requestedCount}</span>
          </p>
          <p className="text-xs" suppressHydrationWarning>
            {formatAdminSessionDate(session.createdAt)}
          </p>
        </div>

        {isOpen ? (
          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={buildAdminSessionDetailPath(session.id)} />}
            >
              Ver detalle
            </Button>
            {hasToken ? (
              <ViewSessionQrButton
                token={session.token}
                cambiadorName={session.cambiadorName}
                sessionCreatedAt={session.createdAt}
              />
            ) : null}
            <Tooltip>
              <TooltipTrigger
                render={
                  <RejectSessionButton
                    sessionId={session.id}
                    cambiadorName={session.cambiadorName}
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  />
                }
              >
                <XIcon />
              </TooltipTrigger>
              <TooltipContent>{`Rechazar sesión de ${session.cambiadorName}`}</TooltipContent>
            </Tooltip>
            <AcceptDialog sessionId={session.id} cambiadorName={session.cambiadorName}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      aria-label={`Aceptar sesión de ${session.cambiadorName}`}
                      className="text-primary hover:bg-primary/10 hover:text-primary"
                    />
                  }
                >
                  <CheckIcon />
                </TooltipTrigger>
                <TooltipContent>{`Aceptar sesión de ${session.cambiadorName}`}</TooltipContent>
              </Tooltip>
            </AcceptDialog>
          </div>
        ) : canArchive ? (
          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={buildAdminSessionDetailPath(session.id)} />}
            >
              Ver detalle
            </Button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onArchive}
                    disabled={isPending}
                    aria-label={`Archivar sesión de ${session.cambiadorName}`}
                  />
                }
              >
                <ArchiveIcon />
                Archivar
              </TooltipTrigger>
              <TooltipContent>{`Archivar sesión de ${session.cambiadorName}`}</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={buildAdminSessionDetailPath(session.id)} />}
            >
              Ver detalle
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
