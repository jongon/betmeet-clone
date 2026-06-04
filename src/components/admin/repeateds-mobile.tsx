"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AlbumSticker, StickerType } from "@/lib/album-catalog";

type MobileProps = {
  stickers: AlbumSticker[];
  activeIndex: number;
  quantities: Record<string, number>;
  onChange: (code: string, value: number) => void;
  onIndexChange: (index: number) => void;
};

const typeLabel: Record<StickerType, string> = {
  BADGE: "Badge",
  TEAM_PHOTO: "Equipo",
  PLAYER: "Jugador",
  SPECIAL: "Especial",
};

export function RepeatedsMobile({
  stickers,
  activeIndex,
  quantities,
  onChange,
  onIndexChange,
}: MobileProps) {
  const total = stickers.length;
  const current = stickers[activeIndex];
  if (!current) return null;
  const value = quantities[current.code] ?? 0;

  const goPrev = () => {
    const prev = Math.max(0, activeIndex - 1);
    onIndexChange(prev);
  };

  const goNext = () => {
    const next = Math.min(total - 1, activeIndex + 1);
    onIndexChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={goPrev}
          disabled={activeIndex === 0}
        >
          <ChevronLeft />
        </Button>
        <p className="text-sm text-muted-foreground">
          Cromo {activeIndex + 1} de {total}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={goNext}
          disabled={activeIndex === total - 1}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-foreground">{current.code}</span>
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            {typeLabel[current.type]}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{current.label}</p>
        <div className="mt-4 flex items-center gap-2">
          <Input
            type="number"
            min={0}
            value={Number.isFinite(value) ? value : 0}
            onChange={(event) => onChange(current.code, Number(event.target.value || 0))}
            className="h-12 flex-1 text-lg"
          />
          <span className="text-xs text-muted-foreground">repetidos</span>
        </div>
      </div>
    </div>
  );
}
