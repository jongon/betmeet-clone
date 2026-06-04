"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { saveGroupRepeatedsAction } from "@/app/admin/cromos/actions";
import { RepeatedsGrid } from "@/components/admin/repeateds-grid";
import { StickerSelector } from "@/components/admin/sticker-selector";
import { Button } from "@/components/ui/button";
import { type AlbumGroup, getGroupStickers } from "@/lib/album-catalog";
import type { ExchangeRule, ExchangeSettings } from "@/lib/exchange-settings";

type PanelProps = {
  groups: AlbumGroup[];
  initialGroup: string;
  totalStickers: number;
  initialItems: Record<string, number>;
  initialGlobalSettings: ExchangeSettings;
  initialOverrides: Record<string, ExchangeRule>;
};

export function RepeatedsPanel({
  groups,
  initialGroup,
  totalStickers,
  initialItems,
  initialGlobalSettings,
  initialOverrides,
}: PanelProps) {
  const [activeGroup, setActiveGroup] = useState(initialGroup);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Record<string, number>>(initialItems);
  const [savedSnapshot, setSavedSnapshot] = useState<Record<string, number>>(initialItems);
  const [overrides, setOverrides] = useState<Record<string, ExchangeRule>>(initialOverrides);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [mobileSelectorOpen, setMobileSelectorOpen] = useState(false);

  const stickers = useMemo(() => getGroupStickers(activeGroup), [activeGroup]);
  const activeGroupLabel = useMemo(() => {
    const group = groups.find((item) => item.groupCode === activeGroup);
    return group ? `${group.groupCode} - ${group.displayName}` : activeGroup;
  }, [activeGroup, groups]);
  const currentItems = useMemo(() => {
    const next: Record<string, number> = {};
    for (const sticker of stickers) {
      next[sticker.code] = items[sticker.code] ?? 0;
    }
    return next;
  }, [items, stickers]);

  const dirty = useMemo(() => {
    return stickers.some(
      (sticker) => (items[sticker.code] ?? 0) !== (savedSnapshot[sticker.code] ?? 0),
    );
  }, [items, savedSnapshot, stickers]);

  const onChangeQuantity = (code: string, value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
    setItems((prev) => ({ ...prev, [code]: safe }));
    setStatus("idle");
  };

  const onSave = () => {
    setStatus("idle");
    startTransition(async () => {
      try {
        await saveGroupRepeatedsAction(activeGroup, currentItems);
        setSavedSnapshot((prev) => {
          const next = { ...prev, ...currentItems };
          for (const [code, value] of Object.entries(currentItems)) {
            if (!value) delete next[code];
          }
          return next;
        });
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  };

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl tracking-tight text-foreground">Cromos repetidos</h1>
          <span className="inline-flex h-5 items-center rounded-full bg-brand px-2 text-xs font-medium text-brand-foreground">
            {totalStickers} cromos
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Registra cuántas copias repetidas tienes por selección. Guarda el equipo completo al
          terminar.
        </p>
        <Link
          href="/admin"
          className="inline-flex text-xs font-medium text-primary hover:underline"
        >
          Volver al home admin
        </Link>
      </header>

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
                  setStatus("idle");
                  setMobileSelectorOpen(false);
                }}
                search={search}
                onSearchChange={setSearch}
              />
            </aside>
          </>
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-[280px_minmax(0,1fr)] sm:items-start">
        <aside className="hidden sm:sticky sm:top-6 sm:block">
          <StickerSelector
            groups={groups}
            value={activeGroup}
            onChange={(value) => {
              setActiveGroup(value);
              setStatus("idle");
            }}
            search={search}
            onSearchChange={setSearch}
          />
        </aside>

        <section>
          <RepeatedsGrid
            stickers={stickers}
            quantities={currentItems}
            onChange={onChangeQuantity}
            globalSettings={initialGlobalSettings}
            overrides={overrides}
            onOverrideSaved={(code, rule) => {
              setOverrides((prev) => ({ ...prev, [code]: rule }));
            }}
          />
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? "Guardando…" : "Guardar equipo"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {dirty ? "Cambios sin guardar" : "Sin cambios"}
        </span>
        {status === "saved" ? (
          <span className="text-xs text-muted-foreground">Guardado</span>
        ) : status === "error" ? (
          <span className="text-xs text-destructive">Error al guardar</span>
        ) : null}
      </div>
    </main>
  );
}
