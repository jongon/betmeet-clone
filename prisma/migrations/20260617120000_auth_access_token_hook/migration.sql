-- Migration: Custom Access Token Hook (Auth) — carry identity gates as JWT claims
--
-- Lets the Next.js proxy/middleware (src/proxy.ts) and getAuthUser
-- (src/lib/supabase/current-user.ts) verify the session LOCALLY via
-- `auth.getClaims()` (asymmetric JWT signing keys) instead of a per-request
-- round-trip to GoTrue (`getUser`) plus a PostgREST `profiles` read. The hook
-- injects two custom claims at token mint (sign-in / refresh):
--   - onboarding_completed: from public.profiles.onboarding_completed
--   - email_verified:       from auth.users.email_confirmed_at IS NOT NULL
--                           (email_confirmed_at is NOT a standard JWT claim)
--
-- The hook is INVOKED by the `supabase_auth_admin` role. It must be granted
-- EXECUTE on the function and SELECT on public.profiles; because profiles has
-- RLS enabled (20260611120000_rls_constraints_triggers), it also needs a SELECT
-- policy. Enabling the hook itself is a dashboard/Auth setting
-- (Authentication → Hooks → Customize Access Token (JWT) Claims) and is not
-- expressible in SQL.
--
-- IDEMPOTENT: CREATE OR REPLACE FUNCTION, idempotent GRANT/REVOKE, and
-- DROP POLICY IF EXISTS before CREATE POLICY, so it is safe to re-apply (e.g.
-- when the function was first created out-of-band via the SQL editor).

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  v_onboarding_completed boolean;
  v_email_verified boolean;
BEGIN
  SELECT
    COALESCE(p.onboarding_completed, false),
    (u.email_confirmed_at IS NOT NULL)
  INTO v_onboarding_completed, v_email_verified
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{onboarding_completed}', to_jsonb(COALESCE(v_onboarding_completed, false)));
  claims := jsonb_set(claims, '{email_verified}', to_jsonb(COALESCE(v_email_verified, false)));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Only the Auth admin role may run the hook.
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

-- The hook reads public.profiles; grant the Auth admin role read access...
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

-- ...and, since profiles has RLS enabled, a SELECT policy for that role.
DROP POLICY IF EXISTS "auth_admin_read_profiles_for_token_hook" ON public.profiles;
CREATE POLICY "auth_admin_read_profiles_for_token_hook"
  ON public.profiles FOR SELECT
  TO supabase_auth_admin
  USING (true);
