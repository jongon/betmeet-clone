"use client";

import { Menu, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { resetStickerOverrideAction, saveStickerRuleAction } from "@/app/admin/cromos/actions";
import { StickerSelector } from "@/components/admin/sticker-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { type AlbumGroup, getGroupStickers, type StickerType } from "@/lib/album-catalog";
import { resolveStickerOverride } from "@/lib/exchange-resolver";
import type {
  ExchangeRule,
  ExchangeSettings,
  OfferType,
  StickerOverride,
} from "@/lib/exchange-settings";

const offerOrder: OfferType[] = ["BADGE", "TEAM_PHOTO", "SPECIAL", "PLAYER", "ANY"];

const typeLabels: Record<StickerType | OfferType, string> = {
  PLAYER: "Jugador",
  BADGE: "Badge",
  TEAM_PHOTO: "Foto equipo",
  SPECIAL: "Especial",
  ANY: "Cualquiera",
};

type PanelProps = {
  groups: AlbumGroup[];
  initialGroup: string;
  globalSettings: ExchangeSettings;
  initialOverrides: Record<string, StickerOverride>;
};

type RowStatus = { tone: "idle" | "saved" | "error"; message: string };

function buildEmptyRule(): ExchangeRule {
  return { PLAYER: 0, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 0 };
}

function cloneRule(rule: ExchangeRule | null | undefined): ExchangeRule {
  return rule ? { ...rule } : buildEmptyRule();
}

function normalizeNumber(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

export function ExchangeOverridesPanel({
  groups,
  initialGroup,
  globalSettings,
  initialOverrides,
}: PanelProps) {
  const [activeGroup, setActiveGroup] = useState(initialGroup);
  const [search, setSearch] = useState("");
  const [mobileSelectorOpen, setMobileSelectorOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, StickerOverride>>(initialOverrides);
  const [draftAbstract, setDraftAbstract] = useState<Record<string, ExchangeRule>>(() => {
    const next: Record<string, ExchangeRule> = {};
    for (const [code, override] of Object.entries(initialOverrides)) {
      next[code] = cloneRule(override.abstract);
    }
    return next;
  });
  const [draftExact, setDraftExact] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const [code, override] of Object.entries(initialOverrides)) {
      next[code] = override.exact?.stickerCode ?? "";
    }
    return next;
  });
  const [useGlobalByCode, setUseGlobalByCode] = useState<Record<string, boolean>>({});
  const [statusByCode, setStatusByCode] = useState<Record<string, RowStatus>>({});
  const [isSaving, startSaving] = useTransition();

  const getBaseRule = (
    stickerType: StickerType,
    override?: StickerOverride | null,
  ): ExchangeRule => {
    return cloneRule(override?.abstract ?? globalSettings[stickerType]);
  };

  const stickers = useMemo(() => getGroupStickers(activeGroup), [activeGroup]);
  const activeGroupLabel = useMemo(() => {
    const group = groups.find((item) => item.groupCode === activeGroup);
    return group ? `${group.groupCode} - ${group.displayName}` : activeGroup;
  }, [activeGroup, groups]);

  const currentStickers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return stickers;
    }

    return stickers.filter((sticker) =>
      `${sticker.code} ${sticker.label}`.toLowerCase().includes(term),
    );
  }, [search, stickers]);

  const onAbstractChange = (stickerCode: string, offerType: OfferType, value: number) => {
    const sticker = stickers.find((item) => item.code === stickerCode);
    if (!sticker) {
      return;
    }

    setDraftAbstract((prev) => ({
      ...prev,
      [stickerCode]: {
        ...cloneRule(prev[stickerCode] ?? getBaseRule(sticker.type, overrides[stickerCode])),
        [offerType]: normalizeNumber(value),
      },
    }));
    setUseGlobalByCode((prev) => ({ ...prev, [stickerCode]: false }));
    setStatusByCode((prev) => ({ ...prev, [stickerCode]: { tone: "idle", message: "" } }));
  };

  const onExactChange = (stickerCode: string, value: string) => {
    setDraftExact((prev) => ({ ...prev, [stickerCode]: value.toUpperCase() }));
    setUseGlobalByCode((prev) => ({ ...prev, [stickerCode]: false }));
    setStatusByCode((prev) => ({ ...prev, [stickerCode]: { tone: "idle", message: "" } }));
  };

  const saveOverride = (stickerCode: string) => {
    startSaving(async () => {
      try {
        if (useGlobalByCode[stickerCode]) {
          const sticker = stickers.find((item) => item.code === stickerCode);
          await resetStickerOverrideAction(stickerCode);
          setOverrides((prev) => {
            const next = { ...prev };
            delete next[stickerCode];
            return next;
          });
          setDraftAbstract((prev) => ({
            ...prev,
            [stickerCode]: sticker ? cloneRule(globalSettings[sticker.type]) : buildEmptyRule(),
          }));
          setDraftExact((prev) => ({ ...prev, [stickerCode]: "" }));
          setStatusByCode((prev) => ({
            ...prev,
            [stickerCode]: { tone: "saved", message: "Volvió a usar la regla global." },
          }));
          setEditingCode(null);
          return;
        }

        const nextOverride: StickerOverride = {
          abstract: draftAbstract[stickerCode] ?? cloneRule(overrides[stickerCode]?.abstract),
          exact: draftExact[stickerCode]?.trim()
            ? { stickerCode: draftExact[stickerCode].trim() }
            : null,
        };

        await saveStickerRuleAction(stickerCode, nextOverride);
        setOverrides((prev) => ({ ...prev, [stickerCode]: nextOverride }));
        setStatusByCode((prev) => ({
          ...prev,
          [stickerCode]: { tone: "saved", message: "Override guardado." },
        }));
        setEditingCode(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo guardar el override.";
        setStatusByCode((prev) => ({
          ...prev,
          [stickerCode]: { tone: "error", message },
        }));
      }
    });
  };

  return (
    <section className="grid gap-6 sm:grid-cols-[280px_minmax(0,1fr)] sm:items-start">
      <div className="sm:hidden">
        <div className="flex items-center justify-between rounded-lg border border-border bg-background p-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Abrir menu de equipos"
            onClick={() => setMobileSelectorOpen(true)}
          >
            <Menu />
          </Button>
          <p className="truncate px-2 text-xs text-muted-foreground">
            Equipo activo: {activeGroupLabel}
          </p>
        </div>
        {mobileSelectorOpen ? (
          <>
            <button
              type="button"
              aria-label="Cerrar selector de equipos"
              className="fixed inset-0 z-30 bg-black/40"
              onClick={() => setMobileSelectorOpen(false)}
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
                  onClick={() => setMobileSelectorOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <StickerSelector
                groups={groups}
                value={activeGroup}
                onChange={(value) => {
                  setActiveGroup(value);
                  setMobileSelectorOpen(false);
                }}
                search={search}
                onSearchChange={setSearch}
              />
            </aside>
          </>
        ) : null}
      </div>

      <aside className="hidden sm:sticky sm:top-6 sm:block">
        <StickerSelector
          groups={groups}
          value={activeGroup}
          onChange={setActiveGroup}
          search={search}
          onSearchChange={setSearch}
        />
      </aside>

      <div className="space-y-3">
        {currentStickers.map((sticker) => {
          const storedOverride = overrides[sticker.code] ?? null;
          const resolved = resolveStickerOverride(storedOverride);
          const isEditing = editingCode === sticker.code;
          const rowStatus = statusByCode[sticker.code] ?? { tone: "idle", message: "" };
          const draftRule =
            draftAbstract[sticker.code] ?? getBaseRule(sticker.type, storedOverride);
          const draftExactValue =
            draftExact[sticker.code] ?? storedOverride?.exact?.stickerCode ?? "";
          const useGlobal = useGlobalByCode[sticker.code] ?? false;

          return (
            <article
              key={sticker.code}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{sticker.code}</span>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      {typeLabels[sticker.type]}
                    </Badge>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      {resolved.source === "override" ? "Override activo" : "Usa global"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{sticker.label}</p>
                  {!isEditing && resolved.source === "override" ? (
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {resolved.components.map((component) => (
                        <span key={`${sticker.code}-${component.kind}`}>
                          {component.kind === "abstract"
                            ? `${component.label}: ${Object.entries(component.rule)
                                .filter(([, value]) => value > 0)
                                .map(
                                  ([offerType, value]) =>
                                    `${typeLabels[offerType as OfferType]} ${value}`,
                                )
                                .join(" · ")}`
                            : `${component.label}: ${component.stickerCode}`}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? null : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingCode(sticker.code)}
                    >
                      Editar
                    </Button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={useGlobal}
                      onCheckedChange={(checked) =>
                        setUseGlobalByCode((prev) => ({
                          ...prev,
                          [sticker.code]: Boolean(checked),
                        }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">Usar regla general</span>
                  </div>

                  {!useGlobal ? (
                    <>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          Regla especial por tipo
                        </p>
                        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                          {offerOrder.map((offerType) => (
                            <div key={`${sticker.code}-${offerType}`} className="space-y-1">
                              <span className="text-[11px] text-muted-foreground">
                                {typeLabels[offerType]}
                              </span>
                              <Input
                                type="number"
                                min={0}
                                value={draftRule[offerType]}
                                onChange={(event) =>
                                  onAbstractChange(
                                    sticker.code,
                                    offerType,
                                    Number(event.target.value || 0),
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          Regla especial por cromo
                        </p>
                        <Input
                          value={draftExactValue}
                          onChange={(event) => onExactChange(sticker.code, event.target.value)}
                          placeholder="POR-15"
                        />
                        <p className="text-xs text-muted-foreground">
                          Solo se guarda si ese cromo está marcado como faltante.
                        </p>
                      </div>

                      <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">Preview</p>
                        <div className="mt-1 space-y-1">
                          <p>
                            Base global visible:{" "}
                            {Object.entries(globalSettings[sticker.type])
                              .filter(([, value]) => value > 0)
                              .map(
                                ([offerType, value]) =>
                                  `${typeLabels[offerType as OfferType]} ${value}`,
                              )
                              .join(" · ") || "Sin intercambio global"}
                          </p>
                          <p>
                            Regla especial por tipo:{" "}
                            {Object.entries(draftRule)
                              .filter(([, value]) => value > 0)
                              .map(
                                ([offerType, value]) =>
                                  `${typeLabels[offerType as OfferType]} ${value}`,
                              )
                              .join(" · ") || "Desactivada"}
                          </p>
                          <p>Regla especial por cromo: {draftExactValue.trim() || "Desactivada"}</p>
                        </div>
                      </div>
                    </>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveOverride(sticker.code)}
                      disabled={isSaving}
                    >
                      {isSaving ? "Guardando..." : "Guardar override"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingCode(null)}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : null}

              {rowStatus.tone !== "idle" ? (
                <p
                  className={`mt-3 text-xs ${rowStatus.tone === "error" ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {rowStatus.message}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
