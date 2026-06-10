-- Migration: Predictions for Unit 5 (Predictions and Match Locking)
-- Prisma manages the base schema. This migration adds RLS, constraints and indexes
-- not fully represented in Prisma.

-- Score bounds: 0–20 per domain entity constraint
ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_scores_range CHECK (
    home_score >= 0 AND home_score <= 20 AND
    away_score >= 0 AND away_score <= 20
  );

-- FK on penalty winner team must reference home or away (domain rule enforced
-- at application level since it depends on match context).
ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_penalty_team_fk
    FOREIGN KEY (penalty_winner_team_id) REFERENCES public.teams(id)
    ON DELETE SET NULL;

-- Immutability trigger: prevent updates to already-locked predictions.
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

-- -------------------------------------------------------
-- RLS: predictions owned by users, only select own
-- -------------------------------------------------------
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "predictions_select_own"
  ON public.predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "predictions_insert_own"
  ON public.predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow updates only on own unlocked predictions (server action remains
-- the authoritative gate for kickoff/status checks).
CREATE POLICY "predictions_update_own_unlocked"
  ON public.predictions FOR UPDATE
  USING (auth.uid() = user_id AND locked_at IS NULL)
  WITH CHECK (auth.uid() = user_id AND locked_at IS NULL);

-- No normal-user delete in v1; service role may clean up via admin in future.
