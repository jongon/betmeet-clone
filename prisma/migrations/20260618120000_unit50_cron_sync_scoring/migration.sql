-- Migration: Unit 50 — Automated competition sync & scoring (Supabase pg_cron + pg_net).
--
-- Schedules tiered POST requests to /api/cron/sync, each guarded by the
-- `x-sync-secret` header. The app base URL and the secret are read from
-- Supabase Vault (`app_base_url`, `sync_trigger_secret`) at job run time and are
-- NEVER stored in this file (avoids committing plaintext secrets — see H-7).
--
-- Tiered schedule (UTC):
--   sync-live-status  */2 * * * *   LIVE_STATUS  (live scores + scoring)
--   sync-results      */5 * * * *   RESULTS      (final scores + scoring)
--   sync-fixtures     0 6 * * *     FIXTURES     (calendar, daily)
--   sync-cleanup      0 4 * * *     CLEANUP      (purge ProviderSyncRun > 90d)
--
-- DEFENSIVE: pg_cron/pg_net are Supabase-managed extensions (enable them in the
-- dashboard) and are absent in local/CI databases. This migration no-ops
-- gracefully where they are unavailable so `prisma migrate deploy` stays green
-- everywhere; the schedules only materialize on the Supabase project.
-- IDEMPOTENT: prior Unit 50 jobs are unscheduled before being re-created.

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    raise notice 'Unit 50: pg_cron/pg_net unavailable — skipping scheduled sync setup.';
    return;
  end if;

  begin
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
  exception when insufficient_privilege then
    raise notice 'Unit 50: cannot create pg_cron/pg_net here — enable them in the Supabase dashboard, then re-run.';
    return;
  end;

  -- Idempotent reset: remove any previously scheduled Unit 50 jobs.
  perform cron.unschedule(jobid)
  from cron.job
  where jobname in ('sync-live-status', 'sync-results', 'sync-fixtures', 'sync-cleanup');

  perform cron.schedule('sync-live-status', '*/2 * * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_base_url')
             || '/api/cron/sync?scope=LIVE_STATUS',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_trigger_secret')
      )
    );
  $job$);

  perform cron.schedule('sync-results', '*/5 * * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_base_url')
             || '/api/cron/sync?scope=RESULTS',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_trigger_secret')
      )
    );
  $job$);

  perform cron.schedule('sync-fixtures', '0 6 * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_base_url')
             || '/api/cron/sync?scope=FIXTURES',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_trigger_secret')
      )
    );
  $job$);

  perform cron.schedule('sync-cleanup', '0 4 * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_base_url')
             || '/api/cron/sync?scope=CLEANUP',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_trigger_secret')
      )
    );
  $job$);

  raise notice 'Unit 50: scheduled sync jobs installed (live/results/fixtures/cleanup).';
end $$;
