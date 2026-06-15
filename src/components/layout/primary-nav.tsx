"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useDictionary } from "@/i18n/dictionary-provider";
import { cn } from "@/lib/utils";

const LINK_KEYS = [
  { href: "/matches", key: "matches" },
  { href: "/pools", key: "pools" },
  { href: "/rankings", key: "rankings" },
  { href: "/rules", key: "rules" },
] as const;

/** True when `pathname` is `href` or a nested route below it. */
export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Primary app navigation. Desktop renders inline links; below `md` it collapses
 * into a Sheet drawer. Active section is marked with `aria-current="page"`.
 */
export function PrimaryNav() {
  const { nav } = useDictionary();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <nav aria-label={nav.primaryLabel} className="hidden items-center gap-1 md:flex">
        {LINK_KEYS.map(({ href, key }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "bg-muted text-foreground",
              )}
            >
              {nav[key]}
            </Link>
          );
        })}
      </nav>

      {/* Mobile */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={nav.openMenu}
              className="md:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          }
        />
        <SheetContent side="left">
          <div className="flex items-center justify-between">
            <SheetTitle>{nav.primaryLabel}</SheetTitle>
            <SheetClose
              render={
                <Button type="button" variant="ghost" size="icon" aria-label={nav.closeMenu}>
                  <X className="size-5" aria-hidden="true" />
                </Button>
              }
            />
          </div>
          <nav aria-label={nav.primaryLabel} className="flex flex-col gap-1">
            {LINK_KEYS.map(({ href, key }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    active && "bg-muted text-foreground",
                  )}
                >
                  {nav[key]}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * Shown only inside `/admin/*`: marks the admin context and offers a way back to
 * the player-facing app. Client component so it can read the current pathname.
 */
export function AdminContextBadge() {
  const { nav } = useDictionary();
  const pathname = usePathname();
  if (!isActive(pathname, "/admin")) return null;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="brand">{nav.adminContext}</Badge>
      <Link
        href="/matches"
        className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
      >
        {nav.backToApp}
      </Link>
    </div>
  );
}
