"use client";

import { ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";
import { saveGlobalExchangeSettingsAction } from "@/app/admin/cromos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StickerType } from "@/lib/album-catalog";
import type { ExchangeSettings, OfferType } from "@/lib/exchange-settings";
import {
  ALL_TYPE_LABEL,
  formatExchangeRuleOptions,
  OFFER_TYPE_ORDER,
} from "@/lib/exchange-settings";
import { normalizeNumber } from "@/lib/utils";

type PanelProps = {
  globalSettings: ExchangeSettings;
  onGlobalSaved?: (globalSettings: ExchangeSettings) => void;
};

type GlobalStatus =
  | { tone: "idle"; message: string }
  | { tone: "saved"; message: string }
  | { tone: "error"; message: string };

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
  const [status, setStatus] = useState<GlobalStatus>({ tone: "idle", message: "" });
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
    setStatus({ tone: "idle", message: "" });
  };

  const saveGlobal = () => {
    startSavingGlobal(async () => {
      try {
        await saveGlobalExchangeSettingsAction(draftGlobal);
        onGlobalSaved?.(draftGlobal);
        setStatus({ tone: "saved", message: "Opciones globales guardadas." });
      } catch (error) {
        setStatus({
          tone: "error",
          message: error instanceof Error ? error.message : "No se pudo guardar la configuración.",
        });
      }
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Opciones globales de intercambio</p>
          <p className="text-xs text-muted-foreground">
            Aplican a los cromos que no tienen intercambio especial por fila.
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
                  Tipo de cromo: {ALL_TYPE_LABEL[kind]}
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  El cambiador podrá cumplir cualquiera de estas opciones.
                </p>
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {OFFER_TYPE_ORDER.map((offerType) => (
                    <div key={`${kind}-${offerType}`} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{ALL_TYPE_LABEL[offerType]}</p>
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
                <p className="mt-3 text-xs text-muted-foreground">
                  Preview:{" "}
                  {formatExchangeRuleOptions(draftGlobal[kind]).join(" o ") ||
                    "Sin opciones definidas"}
                </p>
              </div>
            ))}
          </div>

          {status.tone === "saved" ? (
            <p className="text-xs text-muted-foreground">{status.message}</p>
          ) : status.tone === "error" ? (
            <p className="text-xs text-destructive">{status.message}</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
