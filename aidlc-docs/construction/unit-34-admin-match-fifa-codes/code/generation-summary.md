# Unit 34: Códigos FIFA en `/admin/matches` — Generation Summary

## Scope

UI-only refine sobre Unit 7 Admin and Observability. No cambia schema, rutas, sync, seed, scoring ni presentación pública de `/matches`.

## Implementación

- `src/features/admin/queries.ts`: `getAdminMatches()` ahora construye `label` con `homeTeam.fifaCode` / `awayTeam.fifaCode` en formato `XXX vs YYY`, con fallback por lado a `homePlaceholder` / `awayPlaceholder` / `?`. También expone `homeTeamLabel` y `awayTeamLabel`.
- `src/features/admin/types.ts`: `AdminMatchRow` agrega `homeTeamLabel` y `awayTeamLabel` para reutilizar la etiqueta compacta en componentes.
- `src/features/admin/components/force-result-dialog.tsx`: los labels de score y botones de ganador por penales usan los labels compactos (`BRA`, `ARG`) en lugar de nombres largos.
- `src/features/admin/__tests__/queries.test.ts`: cubre equipo resuelto (`BRA vs ARG`) y placeholders no resueltos.

## NFR / Infraestructura

SKIP. Reutiliza datos existentes (`Team.fifaCode`) y el gate admin existente (`getAdminUserId`). Security Baseline intacto.

## Verification

- `pnpm exec vitest run src/features/admin/__tests__/queries.test.ts src/features/admin/actions/__tests__/revert-override.test.ts src/features/admin/services/__tests__/require-admin.test.ts src/features/admin/services/__tests__/resolve-winner.test.ts` → 4 files, **14/14 tests passed**.
- `pnpm exec vitest run src/features/admin/__tests__/queries.test.ts` → Unit 34 focused re-run, **2/2 tests passed**.
- `pnpm exec tsc --noEmit` → passed.
- `pnpm exec biome check ...` on touched source files → passed. `aidlc-docs/` is ignored by Biome, so Markdown artifacts were reviewed by diff.
- `pnpm exec eslint ...` on touched admin files → passed.
