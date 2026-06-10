-- Migration: Prediction scores — RLS (Unit 6)
-- The prediction_scores table schema is managed via prisma/schema.prisma.
-- Application writes go through Prisma (direct connection, bypasses RLS) with
-- server-side authorization (BR-6.17). RLS below is defense-in-depth for any
-- direct supabase-js reads (leaderboards / prediction views).
-- Apply in Supabase dashboard (SQL Editor).

ALTER TABLE public.prediction_scores ENABLE ROW LEVEL SECURITY;

-- A user can read their own scores
CREATE POLICY "prediction_scores_select_own"
  ON public.prediction_scores FOR SELECT
  USING (user_id = auth.uid());

-- A user can read the scores of members they share at least one pool with
-- (pool leaderboards, BR-6.16)
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

-- Writes (scoring) are performed server-side via Prisma; no anon write policies.
