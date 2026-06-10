import { createClient } from "@/lib/supabase/server";

/** Returns the authenticated user's id, or null. Shared by pool queries/actions. */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Composes the display nickname (`base#1234`) with a graceful fallback. */
export function formatNickname(base: string | null, discriminator: string | null): string {
  if (!base) return "Jugador";
  return discriminator ? `${base}#${discriminator}` : base;
}
