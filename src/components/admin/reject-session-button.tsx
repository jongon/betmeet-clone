"use client";

import { type ComponentProps, type ReactNode, useTransition } from "react";
import { rejectSession } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function RejectSessionButton({
  sessionId,
  cambiadorName,
  variant = "destructive",
  size = "default",
  className,
  children,
}: {
  sessionId: string;
  cambiadorName: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
  children?: ReactNode;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={isPending}
      aria-label={`Rechazar sesión de ${cambiadorName}`}
      onClick={() => {
        startTransition(() => {
          void rejectSession(sessionId);
        });
      }}
    >
      {children}
    </Button>
  );
}
