-- Migration: Competition data, fixture and provider sync foundation (Unit 4)
-- Prisma manages the base schema. This migration adds RLS and constraints that
-- are not fully represented in Prisma.

-- Score bounds (BR-4.18/19)
ALTER TABLE public.matches
  ADD CONSTRAINT matches_scores_non_negative CHECK (
    (home_score IS NULL OR home_score >= 0) AND
    (away_score IS NULL OR away_score >= 0) AND
    (home_penalty_score IS NULL OR home_penalty_score >= 0) AND
    (away_penalty_score IS NULL OR away_penalty_score >= 0)
  );

-- Match prediction requires resolved teams later; Unit 4 allows nullable slots.
CREATE INDEX IF NOT EXISTS matches_competition_kickoff_idx
  ON public.matches (competition_id, kickoff_at);

CREATE INDEX IF NOT EXISTS matches_competition_status_idx
  ON public.matches (competition_id, status);

-- Provider sync runs act as lock + log.
CREATE INDEX IF NOT EXISTS provider_sync_runs_active_idx
  ON public.provider_sync_runs (provider, scope, status, lock_expires_at);

-- ---------------------------------------------------------------------------
-- RLS: fixture data readable by authenticated users, writes server-side only
-- ---------------------------------------------------------------------------
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competitions_select_authenticated"
  ON public.competitions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "competition_phases_select_authenticated"
  ON public.competition_phases FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "teams_select_authenticated"
  ON public.teams FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "matches_select_authenticated"
  ON public.matches FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- provider_sync_runs is intentionally not readable by normal users in v1.
-- Unit 7 admin dashboard will add admin-only access if needed. Writes are via
-- server/service role only.
