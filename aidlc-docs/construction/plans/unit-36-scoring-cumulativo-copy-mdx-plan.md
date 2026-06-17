# Unit 36 — Scoring acumulativo: Plan de copy, MDX y docs

> Code Generation Part 2 — copy/i18n/MDX/docs. La lógica del algoritmo y los tests
> ya estaban actualizados desde el delta AI-DLC previo (FR-REFINE-36).

## Done (pre-existing from delta)

- [x] `src/features/scoring/compute-score.ts` — algoritmo acumulativo + `components` en `ScoreBreakdown`
- [x] `src/features/scoring/scoring-rules.ts` — comentarios actualizados
- [x] `src/features/scoring/__tests__/compute-score.test.ts` — casos acumulativos (RESULT+1goal=3, etc.)
- [x] `src/features/scoring-rankings/services/resolve-points.ts` — `toBreakdown` deriva componentes desde `basePoints`
- [x] `src/features/scoring-rankings/services/__tests__/resolve-points.test.ts` — tests de derivación de componentes
- [x] `src/features/education/components/score-breakdown-explainer.tsx` — líneas de componentes

## Executed in this session

- [x] `src/i18n/dictionaries/es.ts` — scoring section + breakdown keys (result, partial, stackingHint, goalMatched, resultMatched)
- [x] `src/i18n/dictionaries/en.ts` — same
- [x] `content/rules/es/scoring.mdx` — regla acumulativa + ejemplo BRA 2-1 vs BRA 3-2 = 3
- [x] `content/rules/en/scoring.mdx` — same
- [x] `content/rules/es/scoring-teaser.mdx` — "se acumulan: +2 resultado + 1 gol c/u"
- [x] `content/rules/en/scoring-teaser.mdx` — "they stack: +2 result + 1 per team goal"
- [x] `src/features/scoring/scoring-rules.ts` — comentarios de `CORRECT_RESULT`/`PARTIAL_GOAL_COUNT` (ya actualizados desde delta)
- [x] `AGENTS.md` — tabla de Features/Scoring
- [x] `README.md` — sección Puntuación
- [x] `docs/PROJECT.md` — tabla Scoring

## Verification

- [x] `pnpm exec tsc --noEmit` (esperado 0 errores)
- [x] `pnpm exec biome check` (esperado limpio sobre archivos tocados)
- [x] `pnpm exec eslint src` (esperado 0)
- [x] `pnpm test` (full vitest suite)
- [x] AI-DLC state + audit updated
