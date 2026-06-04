"use client";

import { useMemo } from "react";
import Flag from "react-world-flags";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AlbumGroup } from "@/lib/album-catalog";
import { cn } from "@/lib/utils";

type SelectorProps = {
  groups: AlbumGroup[];
  value: string;
  onChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
};

export function StickerSelector({
  groups,
  value,
  onChange,
  search,
  onSearchChange,
}: SelectorProps) {
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((group) =>
      `${group.displayName} ${group.groupCode}`.toLowerCase().includes(term),
    );
  }, [groups, search]);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="team-search">Buscar selección</Label>
        <Input
          id="team-search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Argentina, MEX, FWC..."
        />
      </div>
      <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
        {filtered.map((group) => {
          const isActive = group.groupCode === value;
          return (
            <button
              key={group.groupCode}
              type="button"
              onClick={() => onChange(group.groupCode)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition",
                isActive
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              <span className="inline-flex min-w-10 items-center justify-center rounded-md border border-border bg-muted/40 px-1 py-1 text-[11px] font-semibold tracking-wide text-foreground">
                {group.groupCode}
              </span>
              {group.isoCode ? (
                <div className="h-3.5 w-5 overflow-hidden rounded-[2px] border border-border/70">
                  <Flag
                    code={group.isoCode}
                    fallback={
                      <span className="inline-flex h-full w-full items-center justify-center text-[9px] font-semibold text-muted-foreground">
                        {group.groupCode}
                      </span>
                    }
                    height="14"
                  />
                </div>
              ) : (
                <div className="flex h-3.5 w-5 items-center justify-center rounded-[2px] border border-border text-[8px] font-semibold">
                  FWC
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{group.displayName}</p>
                <p className="text-xs text-muted-foreground">Codigo {group.groupCode}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
