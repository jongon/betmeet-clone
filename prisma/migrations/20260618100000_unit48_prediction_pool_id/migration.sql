ALTER TABLE predictions ADD COLUMN IF NOT EXISTS pool_id UUID REFERENCES pools(id) ON DELETE CASCADE;

ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_user_id_match_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS predictions_user_match_global_uk
  ON predictions(user_id, match_id) WHERE pool_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS predictions_user_match_pool_uk
  ON predictions(user_id, match_id, pool_id) WHERE pool_id IS NOT NULL;
