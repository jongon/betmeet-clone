"use client";

import Image from "next/image";
import { useState } from "react";
import { useDictionary } from "@/i18n/dictionary-provider";
import { cn } from "@/lib/utils";
import { LOCAL_FALLBACK_AVATARS } from "../default-avatars";
import type { AvatarAsset } from "../types";

interface AvatarGridProps {
  avatars: AvatarAsset[];
  selectedId: string | null;
  onSelect: (id: string, url: string) => void;
}

/** Bundled placeholder used when a (remote) avatar image fails to load. */
function localFallbackFor(index: number): string {
  const fallback = LOCAL_FALLBACK_AVATARS[index % LOCAL_FALLBACK_AVATARS.length];
  return fallback.storageUrl;
}

export function AvatarGrid({ avatars, selectedId, onSelect }: AvatarGridProps) {
  const { avatarDefaultLabel } = useDictionary().onboarding;
  // Track avatars whose remote image 404'd (e.g. Storage not seeded / wrong
  // project) so the picker degrades to the bundled local set instead of showing
  // blank slots (FR-REFINE-15.8, hardening FR-REFINE-12.6).
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});

  return (
    <div
      role="listbox"
      aria-label={avatarDefaultLabel}
      className="grid grid-cols-4 gap-2 sm:grid-cols-6"
    >
      {avatars.map((avatar, index) => {
        const selected = avatar.id === selectedId;
        const src = failedIds[avatar.id] ? localFallbackFor(index) : avatar.storageUrl;
        return (
          <button
            key={avatar.id}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={avatar.name}
            onClick={() => onSelect(avatar.id, avatar.storageUrl)}
            className={cn(
              "rounded-lg p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted",
            )}
          >
            <Image
              src={src}
              alt={avatar.name}
              width={64}
              height={64}
              className="h-12 w-12 rounded-full object-cover"
              unoptimized
              onError={() => setFailedIds((prev) => ({ ...prev, [avatar.id]: true }))}
            />
          </button>
        );
      })}
    </div>
  );
}
