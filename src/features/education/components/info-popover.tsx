"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface InfoPopoverProps {
  /** Accessible label for the trigger. */
  label: string;
  children: React.ReactNode;
  cueId?: string;
}

/**
 * Always-available contextual help (BR-2.17). No dismiss state — the info icon
 * opens an accessible popover (base-ui handles focus and Escape).
 */
export function InfoPopover({ label, children, cueId }: InfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        data-testid={cueId ? `info-popover-${cueId}` : "info-popover"}
        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent>{children}</PopoverContent>
    </Popover>
  );
}
