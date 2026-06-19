-- Migration: add `account_deleted` claim to the Custom Access Token Hook
--
-- Extends prisma/migrations/20260617120000_auth_access_token_hook so the proxy
-- (src/proxy.ts) can block soft-deleted accounts LOCALLY via `auth.getClaims()`
-- without a per-request `profiles` read. A fully deleted account no longer has an
-- `auth.users` row (RULE-SEC-03 hard-deletes it), but its access token verifies
-- locally via asymmetric keys until expiry, and legacy "zombie" accounts (profile
-- soft-deleted, auth user still alive) can still mint tokens — this claim closes
-- both gaps.
--
-- IDEMPOTENT: CREATE OR REPLACE FUNCTION, safe to re-apply.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  v_onboarding_completed boolean;
  v_email_verified boolean;
  v_account_deleted boolean;
BEGIN
  SELECT
    COALESCE(p.onboarding_completed, false),
    (u.email_confirmed_at IS NOT NULL),
    (p.deleted_at IS NOT NULL)
  INTO v_onboarding_completed, v_email_verified, v_account_deleted
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{onboarding_completed}', to_jsonb(COALESCE(v_onboarding_completed, false)));
  claims := jsonb_set(claims, '{email_verified}', to_jsonb(COALESCE(v_email_verified, false)));
  claims := jsonb_set(claims, '{account_deleted}', to_jsonb(COALESCE(v_account_deleted, false)));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grants/policies from 20260617120000 remain in effect; nothing else changes.
