import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The authenticated Supabase user for the current request, or null.
 *
 * Wrapped in React `cache()` so every server component, query and action in a
 * single render/request shares ONE `auth.getUser()` round-trip to the Supabase
 * Auth server (GoTrue) instead of each calling it independently
 * (NFR-PERF-REFINE-22.1, Unit 22). Before this, a single `/matches` render made
 * two sequential `getUser()` calls — the `(app)` layout via `getProfile()` and
 * the page via `getCurrentUserId()` — on top of the middleware's own call.
 *
 * Scope note: the middleware in `src/proxy.ts` runs in a separate invocation and
 * is intentionally NOT deduplicated here.
 *
 * Why `getUser()` and not `getClaims()`: `getUser()` validates the JWT against
 * the Auth server (it does not trust the cookie) and returns the full user,
 * including `email_confirmed_at` — which is NOT a JWT claim (see auth-js
 * `JwtPayload`). The email-confirmed gate therefore depends on this. Migrating
 * to `getClaims()` (local verification) only pays off once asymmetric JWT signing
 * keys are enabled in the Supabase project (Operations) and needs a custom claim
 * for `email_confirmed_at`; tracked as a follow-up to NFR-PERF-REFINE-22.1.
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
