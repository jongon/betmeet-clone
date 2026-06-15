-- Unit 26: FK indexes for Match.homeTeamId and Match.awayTeamId
-- Every fixture query does `include: { homeTeam: true, awayTeam: true }`
-- and PostgreSQL runs nested loop joins without these indexes.
CREATE INDEX "matches_home_team_id_idx" ON "matches"("home_team_id");
CREATE INDEX "matches_away_team_id_idx" ON "matches"("away_team_id");
