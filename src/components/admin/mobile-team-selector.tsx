"use client";

import { Menu, X } from "lucide-react";
import { StickerSelector } from "@/components/admin/sticker-selector";
import { Button } from "@/components/ui/button";
import type { AlbumGroup } from "@/lib/album-catalog";

type MobileTeamSelectorProps = {
  groups: AlbumGroup[];
  activeGroup: string;
  activeGroupLabel: string;
  search: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupChange: (groupCode: string) => void;
  onSearchChange: (search: string) => void;
};

export function MobileTeamSelector({
  groups,
  activeGroup,
  activeGroupLabel,
  search,
  open,
  onOpenChange,
  onGroupChange,
  onSearchChange,
}: MobileTeamSelectorProps) {
  return (
    <div className="sm:hidden">
      <div className="flex items-center justify-between rounded-lg border border-border bg-background p-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Abrir menu de equipos"
          onClick={() => onOpenChange(true)}
        >
          <Menu />
        </Button>
        <p className="truncate px-2 text-xs text-muted-foreground">
          Equipo activo: {activeGroupLabel}
        </p>
      </div>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Cerrar selector de equipos"
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => onOpenChange(false)}
          />
          <aside className="fixed top-0 left-0 z-40 h-svh w-[85vw] max-w-[320px] overflow-y-auto border-r border-border bg-background p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Equipo activo</p>
                <p className="truncate text-sm font-medium text-foreground">{activeGroupLabel}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Cerrar menu de equipos"
                onClick={() => onOpenChange(false)}
              >
                <X />
              </Button>
            </div>
            <StickerSelector
              groups={groups}
              value={activeGroup}
              onChange={(groupCode) => {
                onGroupChange(groupCode);
                onOpenChange(false);
              }}
              search={search}
              onSearchChange={onSearchChange}
            />
          </aside>
        </>
      ) : null}
    </div>
  );
}
