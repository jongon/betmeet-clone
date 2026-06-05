import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const styles =
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background bg-clip-padding text-[0.8rem] font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-muted-foreground";

export function AdminNavLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link className={cn(styles, className)} {...props} />;
}
