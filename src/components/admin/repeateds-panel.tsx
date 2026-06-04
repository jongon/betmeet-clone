"use client";

import { Menu, SearchIcon, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { saveGroupRepeatedsAction } from "@/app/admin/cromos/actions";
import { EmptyState } from "@/components/admin/empty-state";
import { RepeatedsGrid } from "@/components/admin/repeateds-grid";
import { StickerSelector } from "@/components/admin/sticker-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type AlbumGroup, getAllAlbumStickers, getGroupStickers } from "@/lib/album-catalog";
import { matchesFlexibleSearch } from "@/lib/search";

type PanelProps = {
  groups: AlbumGroup[];
  initialGroup: string;
  totalStickers: number;
  initialItems: Record<string, number>;
};

export function RepeatedsPanel({ groups, initialGroup, totalStickers, initialItems }: PanelProps) {
  const [activeGroup, setActiveGroup] = useState(initialGroup);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Record<string, number>>(initialItems);
  const [savedSnapshot, setSavedSnapshot] = useState<Record<string, number>>(initialItems);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [mobileSelectorOpen, setMobileSelectorOpen] = useState(false);

  const allStickers = useMemo(() => getAllAlbumStickers(), []);
  const matchingGroupCodes = useMemo(() => {
    if (!search.trim()) return [] as string[];

    const fromGroups = groups
      .filter((group) => matchesFlexibleSearch(search, group.groupCode, group.displayName))
      .map((group) => group.groupCode);
    const fromStickers = allStickers
      .filter((sticker) => matchesFlexibleSearch(search, sticker.code))
      .map((sticker) => sticker.groupCode);

    return [...new Set([...fromGroups, ...fromStickers])];
  }, [allStickers, groups, search]);
  const displayedGroup = useMemo(() => {
    if (!search.trim()) return activeGroup;
    if (matchingGroupCodes.includes(activeGroup)) return activeGroup;
    return matchingGroupCodes[0] ?? activeGroup;
  }, [activeGroup, matchingGroupCodes, search]);
  const stickers = useMemo(() => getGroupStickers(displayedGroup), [displayedGroup]);
  const activeGroupLabel = useMemo(() => {
    const group = groups.find((item) => item.groupCode === displayedGroup);
    return group ? `${group.groupCode} - ${group.displayName}` : displayedGroup;
  }, [displayedGroup, groups]);
  const currentItems = useMemo(() => {
    const next: Record<string, number> = {};
    for (const sticker of stickers) {
      next[sticker.code] = items[sticker.code] ?? 0;
    }
    return next;
  }, [items, stickers]);
  const visibleStickers = useMemo(() => {
    return stickers.filter((sticker) => matchesFlexibleSearch(search, sticker.code));
  }, [search, stickers]);

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
        await saveGroupRepeatedsAction(displayedGroup, currentItems);
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/admin"
            className="inline-flex text-xs font-medium text-primary hover:underline"
          >
            Volver al home admin
          </Link>
          <Link
            href="/admin/cromos/faltantes"
            className="inline-flex text-xs font-medium text-primary hover:underline"
          >
            Ir a faltantes
          </Link>
        </div>
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
                value={displayedGroup}
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
            value={displayedGroup}
            onChange={(value) => {
              setActiveGroup(value);
              setStatus("idle");
            }}
            search={search}
            onSearchChange={setSearch}
          />
        </aside>

        <section>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="album-search" className="text-sm font-medium text-foreground">
                Buscar en todo el album
              </label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="album-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Argentina, ARG-7, badge, jugador..."
                  className="pl-8"
                  aria-label="Buscar en todo el album"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Busca por seleccion o por codigo de cromo, por ejemplo `ARG 7`. Si hay coincidencia
                en otro equipo, la vista cambia automaticamente.
              </p>
            </div>

            {visibleStickers.length > 0 ? (
              <RepeatedsGrid
                stickers={visibleStickers}
                quantities={currentItems}
                onChange={onChangeQuantity}
              />
            ) : (
              <EmptyState
                title="No hay cromos para esa busqueda"
                description={`Prueba con otro codigo o nombre dentro de ${activeGroupLabel}.`}
              />
            )}
          </div>
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
