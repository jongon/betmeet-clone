"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { AvatarAsset } from "../types";

interface AvatarGridProps {
  avatars: AvatarAsset[];
  selectedId: string | null;
  onSelect: (id: string, url: string) => void;
}

export function AvatarGrid({ avatars, selectedId, onSelect }: AvatarGridProps) {
  return (
    <div
      role="listbox"
      aria-label="Default avatars"
      className="grid grid-cols-4 gap-2 sm:grid-cols-6"
    >
      {avatars.map((avatar) => {
        const selected = avatar.id === selectedId;
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
              src={avatar.storageUrl}
              alt={avatar.name}
              width={64}
              height={64}
              className="h-12 w-12 rounded-full object-cover"
              unoptimized
            />
          </button>
        );
      })}
    </div>
  );
}
