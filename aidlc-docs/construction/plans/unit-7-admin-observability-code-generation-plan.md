# Unit 7: Admin and Observability — Code Generation Plan

> Aprobado y en generación (Parte 2). Sin tablas nuevas; reutiliza Match override + ProviderSyncRun.

## Steps
- [x] **Step 1** — `src/features/admin/services/require-admin.ts` (`getAdminUserId()` → userId si ADMIN, si no null), `types.ts` (SyncStatusView, SyncRunRow, AdminMatchRow), `schemas.ts` (ForceResultSchema).
- [x] **Step 2** — `src/features/admin/queries.ts`: `getSyncDashboard()` (BL-4), `getAdminMatches()` (BL-6).
- [x] **Step 3** — Actions: `force-result.ts` (BL-2 + `scoreMatch` síncrono), `revert-override.ts` (BL-3), `trigger-sync.ts` (BL-5: `runCompetitionSync` + `scoreFinishedUnscoredMatches`, try/catch).
- [x] **Step 4** — `src/proxy.ts`: gating `/admin/*` por `verification_status === 'ADMIN'` (no-admin → `/`).
- [x] **Step 5** — UI dashboard `/admin`: `sync-status-panel`, `recent-runs-table`, `trigger-sync-controls`.
- [x] **Step 6** — UI matches `/admin/matches`: `admin-match-list`, `force-result-dialog` (penales+ganador si knockout empatado), `revert-override-button`.
- [x] **Step 7** — Tests: `require-admin` (mock), `resolveWinner`/force-result validación, dashboard mapping.
- [x] **Step 8** — `aidlc-docs/construction/unit-7-admin-observability/code/generation-summary.md`.

## Notas
- Reutiliza `scoreMatch`/`scoreFinishedUnscoredMatches` (Unit 6), `runCompetitionSync`+`ApiFootballProvider` (Unit 4). No modifica `upsertMatch` (Q2=B).
- Validación: tsc, vitest, biome, build. Luego commit.
