-- Drop the unique index on provider_team_id.
-- fifaCode is the canonical team identity; providerTeamId is informational
-- metadata from the external provider (football-data.org) and does not need
-- a uniqueness constraint. Keeping it causes upsertTeam() to fail when
-- the API returns the same numeric team ID for two different fifaCodes.
DROP INDEX IF EXISTS "teams_provider_team_id_key";
