-- The legacy uniqueness on (user_id, match_id) was originally created as a UNIQUE
-- INDEX (predictions_user_id_match_id_key) by the init migration, not as a table
-- constraint. The Unit 48 migration attempted to remove it with
-- `DROP CONSTRAINT IF EXISTS`, which silently no-ops on a plain index, so the index
-- survived and kept forbidding a global prediction and a pool override from
-- coexisting for the same (user_id, match_id). Drop the index explicitly; the
-- partial unique indexes predictions_user_match_global_uk /
-- predictions_user_match_pool_uk already enforce the correct per-scope uniqueness.
DROP INDEX IF EXISTS predictions_user_id_match_id_key;
