import type { AvatarAsset } from "./types";

/**
 * Bundled local placeholder avatars (FR-REFINE-12.6).
 *
 * Used as a fallback when the default avatar set was not seeded or Supabase Storage
 * is unavailable, so the picker never renders an empty grid. Their ids are prefixed
 * with `local:` so server actions can distinguish them from DB-backed assets and
 * resolve them to bundled `public/avatars/*` paths instead of Storage URLs.
 */
export const LOCAL_FALLBACK_AVATAR_PREFIX = "local:";

export const LOCAL_FALLBACK_AVATARS: AvatarAsset[] = [
  {
    id: "local:1",
    name: "Avatar 1",
    storagePath: "/avatars/local-1.svg",
    storageUrl: "/avatars/local-1.svg",
    displayOrder: 1,
  },
  {
    id: "local:2",
    name: "Avatar 2",
    storagePath: "/avatars/local-2.svg",
    storageUrl: "/avatars/local-2.svg",
    displayOrder: 2,
  },
  {
    id: "local:3",
    name: "Avatar 3",
    storagePath: "/avatars/local-3.svg",
    storageUrl: "/avatars/local-3.svg",
    displayOrder: 3,
  },
  {
    id: "local:4",
    name: "Avatar 4",
    storagePath: "/avatars/local-4.svg",
    storageUrl: "/avatars/local-4.svg",
    displayOrder: 4,
  },
  {
    id: "local:5",
    name: "Avatar 5",
    storagePath: "/avatars/local-5.svg",
    storageUrl: "/avatars/local-5.svg",
    displayOrder: 5,
  },
  {
    id: "local:6",
    name: "Avatar 6",
    storagePath: "/avatars/local-6.svg",
    storageUrl: "/avatars/local-6.svg",
    displayOrder: 6,
  },
];

/** Returns the bundled local avatar URL for a `local:`-prefixed id, or null. */
export function resolveLocalAvatarUrl(id: string): string | null {
  if (!id.startsWith(LOCAL_FALLBACK_AVATAR_PREFIX)) return null;
  return LOCAL_FALLBACK_AVATARS.find((a) => a.id === id)?.storageUrl ?? null;
}
