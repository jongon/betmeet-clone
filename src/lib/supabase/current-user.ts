import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Identity derived from the request's JWT claims. Only the fields the app reads
 * downstream (`id`, `email`, `emailVerified`) — not the full Supabase `User`.
 */
export type AuthUser = {
  id: string;
  email: string | null;
  emailVerified: boolean;
};

/**
 * The authenticated user for the current request, or null.
 *
 * Wrapped in React `cache()` so every server component, query and action in a
 * single render/request shares ONE call instead of each calling it
 * independently (NFR-PERF-REFINE-22.1, Unit 22).
 *
 * Uses `getClaims()` (not `getUser()`): with asymmetric JWT signing keys enabled
 * in the Supabase project, `getClaims()` verifies the token signature LOCALLY
 * (public JWKS, cached) instead of a network round-trip to the Auth server on
 * every request. `email_confirmed_at` is not a standard JWT claim, so a Custom
 * Access Token Hook injects `email_verified` (and `onboarding_completed`) — see
 * prisma/migrations/20260617120000_auth_access_token_hook.
 *
 * Scope note: the proxy in `src/proxy.ts` runs in a separate invocation and is
 * intentionally NOT deduplicated here.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : (data?.claims ?? null);
  if (!claims || typeof claims.sub !== "string") return null;

  const record = claims as Record<string, unknown>;
  return {
    id: claims.sub,
    email: typeof record.email === "string" ? record.email : null,
    emailVerified: record.email_verified === true,
  };
});
