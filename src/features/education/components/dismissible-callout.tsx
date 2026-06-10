"use client";

import { Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { dismissCallout, shouldShowCallout } from "@/features/education/services/cue-store";
import { cn } from "@/lib/utils";

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
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(shouldShowCallout(cueId));
  }, [cueId]);

  if (!visible) return null;

  function handleDismiss() {
    dismissCallout(cueId);
    setVisible(false);
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
