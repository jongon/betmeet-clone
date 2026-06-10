"use client";

import { Info, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { dismissCallout, shouldShowCallout } from "@/features/education/services/cue-store";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

interface DismissibleCalloutProps {
  cueId: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Non-intrusive educational callout shown by default and dismissable per
 * browser (BR-2.15, BR-2.19). Renders nothing once dismissed. Visible until
 * mounted to avoid a hydration flash, then re-checks localStorage.
 */
export function DismissibleCallout({ cueId, children, className }: DismissibleCalloutProps) {
  // Read localStorage on the client without a hydration mismatch: show by
  // default on the server snapshot, then honour the dismissal on the client.
  const notPreviouslyDismissed = useSyncExternalStore(
    noopSubscribe,
    () => shouldShowCallout(cueId),
    () => true,
  );
  const [justDismissed, setJustDismissed] = useState(false);
  const visible = notPreviouslyDismissed && !justDismissed;

  if (!visible) return null;

  function handleDismiss() {
    dismissCallout(cueId);
    setJustDismissed(true);
  }

  return (
    <div
      role="note"
      data-testid={`dismissible-callout-${cueId}`}
      className={cn(
        "flex items-start gap-3 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground",
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex-1">{children}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={handleDismiss}
        aria-label="Descartar"
        data-testid={`dismissible-callout-${cueId}-close`}
      >
        <X className="size-3" aria-hidden="true" />
      </Button>
    </div>
  );
}
