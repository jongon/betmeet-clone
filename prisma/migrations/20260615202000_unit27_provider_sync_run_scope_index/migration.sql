-- Unit 27: Index on ProviderSyncRun(scope, status, finishedAt)
-- Replaces the N+1 pattern in admin getSyncDashboard() (6 sequential queries
-- for 6 sync scopes) with a single findMany + in-memory dedup using this index.
-- The existing @@index([provider, scope, status]) requires provider in the WHERE
-- clause; the admin dashboard queries scope+status without provider.
CREATE INDEX "provider_sync_runs_scope_status_finished_at_idx" ON "provider_sync_runs"("scope", "status", "finished_at" DESC);
