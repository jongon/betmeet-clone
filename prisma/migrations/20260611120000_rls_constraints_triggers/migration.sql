-- Migration: RLS, CHECK constraints, partial indexes, triggers and Storage policies
--
-- Ported from supabase/migrations/*.sql (CF-6: consolidated into Prisma migrations).
-- The base tables/enums/indexes/FKs are created by the prior baseline migration
-- (20260609000000_init) from prisma/schema.prisma. This migration adds only what
-- Prisma cannot express: RLS + policies, CHECK constraints, partial/composite
-- indexes, PL/pgSQL triggers, and Supabase Storage policies.
--
-- Requires the Supabase-managed schemas `auth` and `storage`, and the `avatars`
-- Storage bucket (create it before/after; the storage policies below reference it).
--
-- IDEMPOTENT: every CREATE POLICY is preceded by DROP POLICY IF EXISTS, CHECK
-- constraints are dropped before being added, and indexes use IF NOT EXISTS. This
-- lets the migration be re-applied safely when some objects already exist (e.g. a
-- Storage policy created out-of-band via the Supabase dashboard).

-- ===========================================================================
-- profiles (from 20260610000001_create_profiles.sql)
-- ===========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_others" ON public.profiles;
CREATE POLICY "profiles_select_others"
  ON public.profiles FOR SELECT
  USING (deleted_at IS NULL AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = id);

-- ===========================================================================
-- avatar_assets (from 20260610000002_create_avatar_assets.sql)
-- ===========================================================================
ALTER TABLE public.avatar_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avatar_assets_select_public" ON public.avatar_assets;
CREATE POLICY "avatar_assets_select_public"
  ON public.avatar_assets FOR SELECT
  USING (true);

-- ===========================================================================
-- profile auto-creation trigger (from 20260610000003_create_profile_trigger.sql)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_avatar_url TEXT;
BEGIN
  SELECT storage_url INTO default_avatar_url
  FROM public.avatar_assets
  ORDER BY RANDOM()
  LIMIT 1;

  INSERT INTO public.profiles (id, avatar_url, avatar_source, verification_status, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(default_avatar_url, ''),
    'DEFAULT_SET',
    'UNVERIFIED',
    now(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================================================
-- Storage policies for the 'avatars' bucket (from 20260610000004_storage_rls_policies.sql)
-- ===========================================================================
DROP POLICY IF EXISTS "avatars_defaults_public_read" ON storage.objects;
CREATE POLICY "avatars_defaults_public_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'defaults'
  );

DROP POLICY IF EXISTS "avatars_custom_owner_read" ON storage.objects;
CREATE POLICY "avatars_custom_owner_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'custom'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

DROP POLICY IF EXISTS "avatars_custom_owner_insert" ON storage.objects;
CREATE POLICY "avatars_custom_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'custom'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

DROP POLICY IF EXISTS "avatars_custom_owner_delete" ON storage.objects;
CREATE POLICY "avatars_custom_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'custom'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- ===========================================================================
-- pools / pool_memberships (from 20260610000005_create_pools.sql)
-- ===========================================================================
-- Capacity bounds (BR-3.1)
ALTER TABLE public.pools
  DROP CONSTRAINT IF EXISTS pools_capacity_range;
ALTER TABLE public.pools
  ADD CONSTRAINT pools_capacity_range CHECK (capacity BETWEEN 2 AND 100);

-- Pool name unique only among PUBLIC pools (BR-3.2)
CREATE UNIQUE INDEX IF NOT EXISTS pools_public_name_unique
  ON public.pools (name)
  WHERE type = 'PUBLIC';

ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pools_select_public" ON public.pools;
CREATE POLICY "pools_select_public"
  ON public.pools FOR SELECT
  USING (type = 'PUBLIC' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pools_select_member" ON public.pools;
CREATE POLICY "pools_select_member"
  ON public.pools FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pool_memberships m
      WHERE m.pool_id = pools.id AND m.user_id = auth.uid()
    )
  );

ALTER TABLE public.pool_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pool_memberships_select_same_pool" ON public.pool_memberships;
CREATE POLICY "pool_memberships_select_same_pool"
  ON public.pool_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pool_memberships self
      WHERE self.pool_id = pool_memberships.pool_id AND self.user_id = auth.uid()
    )
  );

-- ===========================================================================
-- competition data (from 20260610000006_create_competition_data.sql)
-- ===========================================================================
-- Score bounds (BR-4.18/19)
ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_scores_non_negative;
ALTER TABLE public.matches
  ADD CONSTRAINT matches_scores_non_negative CHECK (
    (home_score IS NULL OR home_score >= 0) AND
    (away_score IS NULL OR away_score >= 0) AND
    (home_penalty_score IS NULL OR home_penalty_score >= 0) AND
    (away_penalty_score IS NULL OR away_penalty_score >= 0)
  );

-- Composite/partial indexes not expressed by Prisma @@index
CREATE INDEX IF NOT EXISTS matches_competition_kickoff_idx
  ON public.matches (competition_id, kickoff_at);

CREATE INDEX IF NOT EXISTS matches_competition_status_idx
  ON public.matches (competition_id, status);

CREATE INDEX IF NOT EXISTS provider_sync_runs_active_idx
  ON public.provider_sync_runs (provider, scope, status, lock_expires_at);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competitions_select_authenticated" ON public.competitions;
CREATE POLICY "competitions_select_authenticated"
  ON public.competitions FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "competition_phases_select_authenticated" ON public.competition_phases;
CREATE POLICY "competition_phases_select_authenticated"
  ON public.competition_phases FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "teams_select_authenticated" ON public.teams;
CREATE POLICY "teams_select_authenticated"
  ON public.teams FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "matches_select_authenticated" ON public.matches;
CREATE POLICY "matches_select_authenticated"
  ON public.matches FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- provider_sync_runs intentionally not readable by normal users in v1.

-- ===========================================================================
-- predictions (from 20260610000007_create_predictions.sql)
-- NOTE: the penalty-team FK is already created by the baseline
-- (predictions_penalty_winner_team_id_fkey, ON DELETE SET NULL) from the Prisma
-- relation, so the duplicate predictions_penalty_team_fk is intentionally omitted.
-- ===========================================================================
ALTER TABLE public.predictions
  DROP CONSTRAINT IF EXISTS predictions_scores_range;
ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_scores_range CHECK (
    home_score >= 0 AND home_score <= 20 AND
    away_score >= 0 AND away_score <= 20
  );

CREATE OR REPLACE FUNCTION prediction_lock_guard()
RETURNS trigger AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL AND (
    NEW.home_score <> OLD.home_score OR
    NEW.away_score <> OLD.away_score OR
    NEW.penalty_winner_team_id IS DISTINCT FROM OLD.penalty_winner_team_id
  ) THEN
    RAISE EXCEPTION 'Cannot modify a locked prediction (match_id=%, user_id=%)',
      NEW.match_id, NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prediction_lock_guard ON public.predictions;
CREATE TRIGGER trg_prediction_lock_guard
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION prediction_lock_guard();

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "predictions_select_own" ON public.predictions;
CREATE POLICY "predictions_select_own"
  ON public.predictions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_insert_own" ON public.predictions;
CREATE POLICY "predictions_insert_own"
  ON public.predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_update_own_unlocked" ON public.predictions;
CREATE POLICY "predictions_update_own_unlocked"
  ON public.predictions FOR UPDATE
  USING (auth.uid() = user_id AND locked_at IS NULL)
  WITH CHECK (auth.uid() = user_id AND locked_at IS NULL);

-- ===========================================================================
-- prediction_scores (from 20260610000010_create_prediction_scores.sql)
-- ===========================================================================
ALTER TABLE public.prediction_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prediction_scores_select_own" ON public.prediction_scores;
CREATE POLICY "prediction_scores_select_own"
  ON public.prediction_scores FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "prediction_scores_select_pool_peers" ON public.prediction_scores;
CREATE POLICY "prediction_scores_select_pool_peers"
  ON public.prediction_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.pool_memberships viewer
      JOIN public.pool_memberships owner
        ON owner.pool_id = viewer.pool_id
      WHERE viewer.user_id = auth.uid()
        AND owner.user_id = prediction_scores.user_id
    )
  );

-- ===========================================================================
-- notifications RLS (from 20260611000001_create_notifications.sql)
-- Tables/enums/indexes are created by the baseline; only RLS is ported here.
-- ===========================================================================
ALTER TABLE public.pool_directed_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pool directed invites visible to participants" ON public.pool_directed_invites;
CREATE POLICY "pool directed invites visible to participants"
  ON public.pool_directed_invites FOR SELECT
  USING (created_by_user_id = auth.uid() OR invited_user_id = auth.uid());

DROP POLICY IF EXISTS "notification preferences own read" ON public.notification_preferences;
CREATE POLICY "notification preferences own read"
  ON public.notification_preferences FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notification preferences own write" ON public.notification_preferences;
CREATE POLICY "notification preferences own write"
  ON public.notification_preferences FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push subscriptions own read" ON public.push_subscriptions;
CREATE POLICY "push subscriptions own read"
  ON public.push_subscriptions FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "push subscriptions own write" ON public.push_subscriptions;
CREATE POLICY "push subscriptions own write"
  ON public.push_subscriptions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notification events own read" ON public.notification_events;
CREATE POLICY "notification events own read"
  ON public.notification_events FOR SELECT USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "notification deliveries own read" ON public.notification_deliveries;
CREATE POLICY "notification deliveries own read"
  ON public.notification_deliveries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.push_subscriptions ps
    WHERE ps.id = notification_deliveries.subscription_id AND ps.user_id = auth.uid()
  ));
