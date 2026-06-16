# Unit 31 — "Revertir a la API" también revierte el puntaje de los usuarios (Functional Design, light)

**Tipo**: refine post-construcción (bajo riesgo) sobre Unit 7 (Admin) + Unit 6 (Scoring).
**No reinicia** Units 1–30. Sin schema, migraciones ni rutas.
**Añadida vía** `/aidlc:start` (2026-06-16).

## 1. Problema / Causa raíz

`revertMatchOverride` (`src/features/admin/actions/revert-override.ts`) limpiaba **solo** los flags de
override (`manualOverride`, `manualOverrideReason`, `overriddenByUserId`, `overriddenAt`), pero
**conservaba** el resultado manual (`homeScore`, `awayScore`, `winnerTeamId`, `status=FINISHED`).
La llamada a `scoreMatch(matchId)` re-puntuaba contra ese mismo resultado, por lo que los usuarios
**mantenían** los puntos que habían ganado con el override. El botón, además, revertía con un solo
clic sin confirmación.

## 2. Decisiones (AskUserQuestion, 2026-06-16)

| Decisión | Elección | Nota |
|---|---|---|
| Semántica del revert | **Limpiar resultado + quitar puntos** | El resultado original de la API **no** se snapshotea (`force-result` sobrescribe en sitio), así que se limpia y el próximo sync repuebla; no se "restaura" un valor previo. |
| Confirmación | **Sí, diálogo de confirmación** | La acción ahora es destructiva (elimina `PredictionScore`). |

## 3. Diseño

### FR-REFINE-31.1 — `revertMatchOverride`
El `prisma.match.update` limpia, además de los flags de override:
- `homeScore`, `awayScore`, `homePenaltyScore`, `awayPenaltyScore`, `winnerTeamId` → `null`
- `status` → `"SCHEDULED"`

`scoreMatch(matchId)` (sin cambios) encuentra el partido **no scoreable**
(`status !== "FINISHED"` / scores `null`) y ejecuta `prisma.predictionScore.deleteMany({ where: { matchId } })`
(`score-match.ts:26-28`, BR-6.7) → puntos revertidos. Se conservan `logAuthEvent("admin.override_reverted")`,
`revalidatePath("/admin/matches")` y `revalidateTag(COMPETITION_FIXTURE_TAG/RANKINGS_TAG, "max")`.

### FR-REFINE-31.2 — `RevertOverrideButton`
El botón se envuelve en el primitivo `Dialog` de base-ui (`@/components/ui/dialog`, mismo patrón que
`force-result-dialog.tsx`): `DialogTrigger` (render del `Button` ghost) → `DialogContent` con
título/descripción de advertencia → `DialogFooter` con **Cancelar** (`outline`) y **Revertir**
(`destructive`, ejecuta `revertMatchOverride` y cierra). `data-testid` de confirmación añadido.

### i18n
Claves nuevas en el namespace `admin` (es/en): `revertConfirmTitle`, `revertConfirmBody`,
`revertConfirm`, `cancel`. `EsDictionary` es la fuente de verdad; `en` las satisface por `satisfies Dictionary`.

## 4. Trazabilidad

| Requisito | Historia | Implementación |
|---|---|---|
| FR-REFINE-31.1 | US-30.1 | `actions/revert-override.ts` |
| FR-REFINE-31.2 | US-30.1 | `components/revert-override-button.tsx`, `i18n/dictionaries/{es,en}.ts` |

## 5. Fuera de alcance
- No se persiste un snapshot del resultado API previo (decisión del usuario: limpiar, no restaurar).
- No se dispara un sync inmediato tras revertir (el próximo sync programado repuebla).

## 6. Verificación
- `pnpm exec tsc --noEmit` — 0 errores.
- `pnpm exec biome check` (archivos tocados) — limpio.
- `pnpm exec eslint` (archivos tocados) — 0.
- `pnpm test` (vitest) — **225/225** (incluye `revert-override.test.ts`, 4 casos).
- `pnpm build` (`next build`) — OK.
- Smoke manual: forzar resultado en `/admin/matches`, ver puntos en rankings, "Revertir a la API" →
  confirmar → partido vuelve a `SCHEDULED` y los puntos desaparecen del ranking.
