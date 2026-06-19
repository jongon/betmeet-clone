-- Migration: Unit 51 — Dedicated Web Push dispatch cron (Supabase pg_cron + pg_net).
--
-- Unit 50 already drains the notification outbox best-effort at the end of every
-- provider sync run (`runScheduledSync` → `dispatchPendingNotifications`). That
-- couples delivery to the provider tiers: POOL_INVITE events (created by user
-- actions at any time) wait up to ~5 min for the next RESULTS run, and delivery
-- stops entirely outside match windows when the live tier short-circuits.
--
-- This migration adds a standalone, provider-independent dispatcher that hits
-- `POST /api/notifications/dispatch` every minute. The route is guarded by the
-- same `x-sync-secret` header and `dispatchPendingNotifications` is idempotent
-- and a no-op when the outbox is empty (one indexed query) and when VAPID env
-- vars are missing, so a per-minute cadence is safe and has no provider cost.
--
-- The app base URL and the secret are read from Supabase Vault (`app_base_url`,
-- `sync_trigger_secret`) at job run time and are NEVER stored in this file.
--
-- DEFENSIVE: pg_cron/pg_net are Supabase-managed extensions and are absent in
-- local/CI databases. This migration no-ops gracefully where they are
-- unavailable so `prisma migrate deploy` stays green everywhere.
-- IDEMPOTENT: any prior dispatch job is unscheduled before being re-created.

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    raise notice 'Unit 51: pg_cron/pg_net unavailable — skipping notification dispatch cron setup.';
    return;
  end if;

  begin
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
  exception when insufficient_privilege then
    raise notice 'Unit 51: cannot create pg_cron/pg_net here — enable them in the Supabase dashboard, then re-run.';
    return;
  end;

  -- Idempotent reset: remove any previously scheduled dispatch job.
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'dispatch-notifications';

  perform cron.schedule('dispatch-notifications', '* * * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_base_url')
             || '/api/notifications/dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_trigger_secret')
      )
    );
  $job$);

  raise notice 'Unit 51: notification dispatch cron installed (every minute).';
end $$;
