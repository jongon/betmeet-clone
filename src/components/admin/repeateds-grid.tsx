"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { type AlbumSticker, STICKER_TYPE_LABEL } from "@/lib/album-catalog";
import { cn } from "@/lib/utils";

type GridProps = {
  stickers: AlbumSticker[];
  quantities: Record<string, number>;
  missingItems: Record<string, boolean>;
  onChange: (code: string, value: number) => void;
};

export function RepeatedsGrid({ stickers, quantities, missingItems, onChange }: GridProps) {
  return (
    <div className="space-y-3">
      {stickers.map((sticker) => {
        const isMissing = missingItems[sticker.code] === true;
        const value = isMissing ? 0 : (quantities[sticker.code] ?? 0);
        return (
          <div
            key={sticker.code}
            className={cn(
              "w-full rounded-xl border bg-background p-4",
              isMissing
                ? "border-muted bg-muted/40"
                : value > 0
                  ? "border-primary/30 bg-primary/5"
                  : "border-border",
            )}
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-xs font-semibold">
                    {sticker.code.split("-")[1]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{sticker.code}</span>
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        {STICKER_TYPE_LABEL[sticker.type]}
                      </Badge>
                      {isMissing ? (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          Faltante
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{sticker.label}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">Repetidos</span>
                  <Input
                    type="number"
                    min={0}
                    value={Number.isFinite(value) ? value : 0}
                    disabled={isMissing}
                    onChange={(event) => onChange(sticker.code, Number(event.target.value || 0))}
                  />
                  {isMissing ? (
                    <p className="text-[11px] text-muted-foreground">
                      Desactiva este cromo como faltante para poder guardarlo como repetido.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
