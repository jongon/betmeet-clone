"use client";

import { ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";
import { saveGlobalExchangeSettingsAction } from "@/app/admin/cromos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StickerType } from "@/lib/album-catalog";
import type { ExchangeSettings, OfferType } from "@/lib/exchange-settings";

const offerOrder: OfferType[] = ["BADGE", "TEAM_PHOTO", "SPECIAL", "PLAYER", "ANY"];

const typeLabels: Record<StickerType | OfferType, string> = {
  PLAYER: "Jugador",
  BADGE: "Badge",
  TEAM_PHOTO: "Foto equipo",
  SPECIAL: "Especial",
  ANY: "Cualquiera",
};

type PanelProps = {
  globalSettings: ExchangeSettings;
  onGlobalSaved?: (globalSettings: ExchangeSettings) => void;
};

function normalizeNumber(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function cloneGlobalSettings(globalSettings: ExchangeSettings): ExchangeSettings {
  return {
    PLAYER: { ...globalSettings.PLAYER },
    BADGE: { ...globalSettings.BADGE },
    TEAM_PHOTO: { ...globalSettings.TEAM_PHOTO },
    SPECIAL: { ...globalSettings.SPECIAL },
  };
}

export function RepeatedsSettingsPanel({ globalSettings, onGlobalSaved }: PanelProps) {
  const [isSavingGlobal, startSavingGlobal] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved-global" | "error">("idle");
  const [expanded, setExpanded] = useState(false);

  const [draftGlobal, setDraftGlobal] = useState<ExchangeSettings>(() =>
    cloneGlobalSettings(globalSettings),
  );

  const onGlobalChange = (stickerKind: StickerType, offerType: OfferType, value: number) => {
    setDraftGlobal((prev) => ({
      ...prev,
      [stickerKind]: {
        ...prev[stickerKind],
        [offerType]: normalizeNumber(value),
      },
    }));
    setStatus("idle");
  };

  const saveGlobal = () => {
    startSavingGlobal(async () => {
      try {
        await saveGlobalExchangeSettingsAction(draftGlobal);
        onGlobalSaved?.(draftGlobal);
        setStatus("saved-global");
      } catch {
        setStatus("error");
      }
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Reglas globales del álbum</p>
          <p className="text-xs text-muted-foreground">
            Aplican a los cromos que no tienen override por fila.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <ChevronDown className={`transition-transform ${expanded ? "rotate-180" : "rotate-0"}`} />
          {expanded ? "Ocultar" : "Expandir"}
        </Button>
      </div>

      {expanded ? (
        <>
          <div className="flex items-center justify-end">
            <Button type="button" size="sm" onClick={saveGlobal} disabled={isSavingGlobal}>
              {isSavingGlobal ? "Guardando..." : "Guardar global"}
            </Button>
          </div>

          <div className="space-y-4">
            {(["PLAYER", "BADGE", "TEAM_PHOTO", "SPECIAL"] as StickerType[]).map((kind) => (
              <div key={kind} className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  Tipo de cromo: {typeLabels[kind]}
                </p>
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {offerOrder.map((offerType) => (
                    <div key={`${kind}-${offerType}`} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {typeLabels[offerType]}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={draftGlobal[kind][offerType]}
                        onChange={(event) =>
                          onGlobalChange(kind, offerType, Number(event.target.value || 0))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {status === "saved-global" ? (
            <p className="text-xs text-muted-foreground">Settings globales guardados.</p>
          ) : status === "error" ? (
            <p className="text-xs text-destructive">No se pudo guardar la configuración.</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
