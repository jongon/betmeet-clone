# Unit 7: Admin and Observability — Code Generation Summary

## Validación
- **Type check**: `tsc --noEmit` → **0 errores**.
- **Tests**: `vitest run` → **111/111** (26 archivos), incl. resolve-winner + require-admin.
- **Formato**: Biome limpio.
- **Build**: `pnpm build` → **passing** (rutas `/admin`, `/admin/matches`).

## Decisiones aplicadas
- Forzar resultado → re-score **síncrono** (Q1).
- **La API gana** (Q2): **no** se modifica `upsertMatch`; override transitorio.
- Dashboard **+ "Sincronizar ahora"** (Q3).
- **Revertir override** (Q4).

## Archivos creados
```
src/features/admin/services/require-admin.ts        (getAdminUserId — BL-1)
src/features/admin/services/resolve-winner.ts       (BR-7.3)
src/features/admin/types.ts                         (SyncStatusView, AdminMatchRow, ...)
src/features/admin/schemas.ts                       (ForceResultSchema)
src/features/admin/queries.ts                       (getSyncDashboard, getAdminMatches — BL-4/6)
src/features/admin/actions/{force-result,revert-override,trigger-sync}.ts  (BL-2/3/5)
src/features/admin/components/{sync-status-panel,recent-runs-table,trigger-sync-controls,
  admin-match-list,force-result-dialog,revert-override-button}.tsx
src/app/admin/page.tsx
src/app/admin/matches/page.tsx
src/features/admin/services/__tests__/{resolve-winner,require-admin}.test.ts
```

## Archivos modificados (integración)
```
src/proxy.ts            (gating /admin/* por verification_status === 'ADMIN')
src/lib/auth-logger.ts  (+ eventos admin.match_overridden / override_reverted / sync_triggered)
```

## Reutilización
- `scoreMatch` (Unit 6) en force/revert; `scoreFinishedUnscoredMatches` (Unit 6) post-sync.
- `runCompetitionSync` + `ApiFootballProvider` (Unit 4) en el trigger manual.
- **No** crea tablas/migraciones; la auditoría de overrides son los campos de `Match`.

## Notas
- `triggerSync` maneja `API_FOOTBALL_KEY_MISSING` con mensaje claro (en dev sin clave el run queda FAILED y se informa).
- Gating doble: proxy (`/admin/*`) + `getAdminUserId()` en cada query/action.
