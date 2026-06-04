"use client";

import { useState, useTransition } from "react";
import { resetStickerOverrideAction, saveStickerOverrideAction } from "@/app/admin/cromos/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AlbumSticker, StickerType } from "@/lib/album-catalog";
import type { ExchangeRule, ExchangeSettings } from "@/lib/exchange-settings";
import { cn } from "@/lib/utils";

type GridProps = {
  stickers: AlbumSticker[];
  quantities: Record<string, number>;
  onChange: (code: string, value: number) => void;
  globalSettings: ExchangeSettings;
  overrides: Record<string, ExchangeRule>;
  onOverrideSaved: (stickerCode: string, rule: ExchangeRule | null) => void;
};

const typeLabel: Record<StickerType, string> = {
  BADGE: "Badge",
  TEAM_PHOTO: "Equipo",
  PLAYER: "Jugador",
  SPECIAL: "Especial",
};

export function RepeatedsGrid({
  stickers,
  quantities,
  onChange,
  globalSettings,
  overrides,
  onOverrideSaved,
}: GridProps) {
  const [draftOverrides, setDraftOverrides] = useState<Record<string, ExchangeRule>>(overrides);
  const [statusByCode, setStatusByCode] = useState<Record<string, "idle" | "saved" | "error">>({});
  const [isSaving, startSaving] = useTransition();

  const normalizeNumber = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.trunc(value));
  };

  const resolveRule = (sticker: AlbumSticker): ExchangeRule => {
    return draftOverrides[sticker.code] ?? overrides[sticker.code] ?? globalSettings[sticker.type];
  };

  const onOverrideChange = (
    sticker: AlbumSticker,
    offerType: keyof ExchangeRule,
    value: number,
  ) => {
    const baseRule = resolveRule(sticker);
    const nextRule: ExchangeRule = {
      ...baseRule,
      [offerType]: normalizeNumber(value),
    };
    setDraftOverrides((prev) => ({ ...prev, [sticker.code]: nextRule }));
    setStatusByCode((prev) => ({ ...prev, [sticker.code]: "idle" }));
  };

  const saveOverride = (sticker: AlbumSticker) => {
    const rule = resolveRule(sticker);
    startSaving(async () => {
      try {
        await saveStickerOverrideAction(sticker.code, rule);
        onOverrideSaved(sticker.code, rule);
        setStatusByCode((prev) => ({ ...prev, [sticker.code]: "saved" }));
      } catch {
        setStatusByCode((prev) => ({ ...prev, [sticker.code]: "error" }));
      }
    });
  };

  const resetOverride = (sticker: AlbumSticker) => {
    startSaving(async () => {
      try {
        await resetStickerOverrideAction(sticker.code);
        setDraftOverrides((prev) => {
          const next = { ...prev };
          delete next[sticker.code];
          return next;
        });
        onOverrideSaved(sticker.code, null);
        setStatusByCode((prev) => ({ ...prev, [sticker.code]: "saved" }));
      } catch {
        setStatusByCode((prev) => ({ ...prev, [sticker.code]: "error" }));
      }
    });
  };

  return (
    <div className="space-y-3">
      {stickers.map((sticker) => {
        const value = quantities[sticker.code] ?? 0;
        const rule = resolveRule(sticker);
        const overrideRule = overrides[sticker.code];
        const rowStatus = statusByCode[sticker.code] ?? "idle";
        return (
          <div
            key={sticker.code}
            className={cn(
              "w-full rounded-xl border bg-background p-4",
              value > 0 ? "border-primary/30 bg-primary/5" : "border-border",
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
                        {typeLabel[sticker.type]}
                      </Badge>
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        {overrideRule ? "Override activo" : "Usa global"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{sticker.label}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Jugador</span>
                    <Input
                      type="number"
                      min={0}
                      value={rule.PLAYER}
                      onChange={(event) =>
                        onOverrideChange(sticker, "PLAYER", Number(event.target.value || 0))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Badge</span>
                    <Input
                      type="number"
                      min={0}
                      value={rule.BADGE}
                      onChange={(event) =>
                        onOverrideChange(sticker, "BADGE", Number(event.target.value || 0))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Foto equipo</span>
                    <Input
                      type="number"
                      min={0}
                      value={rule.TEAM_PHOTO}
                      onChange={(event) =>
                        onOverrideChange(sticker, "TEAM_PHOTO", Number(event.target.value || 0))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Especial</span>
                    <Input
                      type="number"
                      min={0}
                      value={rule.SPECIAL}
                      onChange={(event) =>
                        onOverrideChange(sticker, "SPECIAL", Number(event.target.value || 0))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Cualquiera</span>
                    <Input
                      type="number"
                      min={0}
                      value={rule.ANY}
                      onChange={(event) =>
                        onOverrideChange(sticker, "ANY", Number(event.target.value || 0))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">Repetidos</span>
                    <Input
                      type="number"
                      min={0}
                      value={Number.isFinite(value) ? value : 0}
                      onChange={(event) => onChange(sticker.code, Number(event.target.value || 0))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => saveOverride(sticker)}
                    disabled={isSaving}
                  >
                    {isSaving ? "Guardando..." : `Guardar override ${sticker.code}`}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => resetOverride(sticker)}
                    disabled={isSaving || !overrideRule}
                  >
                    Usar global
                  </Button>
                  {rowStatus === "saved" ? (
                    <span className="text-xs text-muted-foreground">
                      {overrideRule ? "Override guardado." : "Volvió a usar la regla global."}
                    </span>
                  ) : rowStatus === "error" ? (
                    <span className="text-xs text-destructive">No se pudo guardar.</span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-start lg:justify-end">
                <span className="text-[11px] text-muted-foreground">
                  {overrideRule
                    ? "Este cromo ya tiene override guardado"
                    : "Sin override guardado (usa regla global)"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
