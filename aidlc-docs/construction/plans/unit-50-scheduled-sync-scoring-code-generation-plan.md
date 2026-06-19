# Code Generation Plan — Unit 50: Sync & Scoring Automáticos (Crons)

> Estado: **EXECUTED** (2026-06-18). Implementado y verificado. No reinicia Units 1–49.

## Pasos

1. **Servicio compartido** `src/features/competition/services/run-scheduled-sync.ts`:
   - `runScheduledSync(scope, { source = "cron" })` — CLEANUP → `cleanupOldSyncRuns`; scopes de
     proveedor → `runCompetitionSync` → `scoreFinishedUnscoredMatches` → best-effort
     `dispatchPendingNotifications`. Maneja `FOOTBALL_DATA_KEY_MISSING`. `windowKey` con `source`.
   - `hasActiveMatchWindow(now?)` — `prisma.match.count` por status LIVE/LOCKED o kickoff ±3h.
   - Export `SYNC_PROVIDER_SCOPES`.
2. **Refactor admin** `src/features/admin/actions/trigger-sync.ts`: `triggerSync` valida admin +
   scope y delega en `runScheduledSync(scope, { source: "manual" })`; conserva `logAuthEvent` +
   `revalidateResultViews`.
3. **Ruta** `src/app/api/cron/sync/route.ts` (`runtime = "nodejs"`): guard `x-sync-secret`,
   allowlist de scopes (incl. CLEANUP), short-circuit de LIVE_STATUS vía `hasActiveMatchWindow`,
   `runScheduledSync(scope, { source:"cron" })`, revalida (salvo CLEANUP), códigos 401/400/502/200.
4. **Migración** `prisma/migrations/20260618120000_unit50_cron_sync_scoring/migration.sql`:
   extensiones pg_cron/pg_net + 4 `cron.schedule` idempotentes leyendo Vault; defensiva (no-op
   donde no hay pg_cron/pg_net).
5. **Env** `.env.example`: `SYNC_TRIGGER_SECRET` + nota de Vault (`app_base_url`, `sync_trigger_secret`).
6. **Operaciones** `aidlc-docs/operations/operations-runbook.md`: §7 Crons + ítem de checklist.
7. **Tests**: `run-scheduled-sync.test.ts`, `route.test.ts`; mantener `trigger-sync.test.ts` verde.

## Verificación

`tsc` 0 · Vitest 370/370 · ESLint 0 errores · Biome limpio (archivos nuevos) · `pnpm build` OK
(ruta `/api/cron/sync` registrada).
