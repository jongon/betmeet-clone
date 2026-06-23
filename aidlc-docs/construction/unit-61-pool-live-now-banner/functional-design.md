# Functional Design — Unit 61: Banner «En vivo ahora» en el pool

> Refine post-construcción (2026-06-23) vía `/aidlc:refine`. **Plan presentado y aprobado antes de ejecutar** (decisiones vía AskUserQuestion: enfoque = **banner cross-tab «En vivo ahora»** visible desde las 3 pestañas —frente a fijar LIVE arriba del grid o ambos—; detalle = **rico**, predicción + puntos por miembro, no solo marcador+CTA). Refine sobre **Unit 41** (predicciones visibles / `getPoolMemberPredictions` / `buildDayGroups`), **Unit 48** (override por pool — resolución override ?? global), **Unit 56** (`preJoin`), **Unit 57** (`useKickoffTick`) y **Unit 58** (`useLiveResults` + marcador LIVE en cabecera). **No reinicia** etapas aprobadas (Units 1–60 intactas).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-61.1 | requirements | Banner «En vivo ahora» cross-tab en `/pools/[id]` cuando hay partido(s) `LIVE`. |
| FR-REFINE-61.2 | requirements | Detalle rico: predicción (override ?? global) + puntos por miembro; `preJoin` respetado. |
| FR-REFINE-61.3 | requirements | CTA «Ver en Predicciones» con `?tab` URL-driven (supersede BR-41.7). |
| FR-REFINE-61.4 | requirements | Refresco en vivo vía `useLiveResults` montado una vez en el contenedor; degradación limpia. |
| US-61.1 | stories | Ver qué partido(s) está(n) en juego en mi liga desde cualquier pestaña. |

## 1. Contexto y causa raíz

**Brecha de descubribilidad**, no de datos. El dato de partidos LIVE ya está disponible server-side:

1. `getPoolMemberPredictions(poolId)` (`src/features/pools/queries.ts:126`) devuelve `{ matches: MatchView[]; predictions: PoolMemberPrediction[] }` con **todos** los partidos del pool (sin filtro `kickoffAt <= now` desde Unit 48), cada uno con `matchStatus`/`homeScore`/`awayScore`/`matchNumber`/`kickoffAt`/equipos. Los `LIVE` ya vienen con marcador.
2. **Unit 58** añadió el marcador en vivo + badge LIVE a la **cabecera de cada columna** del grid de Predicciones (`pool-predictions-view.tsx:69-95`) y el refresco en vivo vía `useLiveResults()`.

Pero el grid está **paginado 1 día/página** con default = hoy (`paginateDays`, `pool-predictions-view-helpers.ts:188`), y la pestaña activa es **client-only sin parámetro de URL** (**BR-41.7**). Consecuencia:
- Un partido en vivo en un día ≠ hoy queda oculto salvo que el usuario navegue a esa página.
- Desde las pestañas **Clasificación** y **Miembros** no hay **ninguna** señal de que un partido está en juego.

**Decisión de enfoque (AskUserQuestion)**: **banner cross-tab** (frente a fijar LIVE arriba del grid dentro de Predicciones, o ambos). Visible arriba de los `<Tabs>`, en las 3 pestañas, oculto sin hueco cuando no hay LIVE.
**Decisión de detalle (AskUserQuestion)**: **rico** — predicción (override ?? global) + puntos por miembro, no solo marcador+CTA.

## 2. Business Rules

### BR-61.1 — Presencia/ausencia del banner
El banner se renderiza **arriba de los `<Tabs>`** en `/pools/[id]` si y solo si `liveMatches.length > 0`, donde `liveMatches = predictionsData.matches.filter(m => m.matchStatus === "LIVE")`. Sin partidos LIVE → no se renderiza (sin contenedor vacío, sin hueco). El cálculo de `liveMatches` se hace en el **server** (`page.tsx`) y se pasa al contenedor cliente; la transición LIVE→FINISHED ocurre en el siguiente refresco/sync (el cron `LIVE_STATUS` corre cada ~2 min, Unit 50).

### BR-61.2 — Cross-tab
El banner es visible desde las tres pestañas (Clasificación, Predicciones, Miembros) porque se monta **fuera** de los `<TabsContent>`, en el contenedor cliente `PoolDetailTabs` que envuelve a los `<Tabs>`.

### BR-61.3 — Resolución de predicción por miembro (override ?? global)
Por cada partido LIVE y cada miembro del pool, la celda usa la **misma resolución** que la grilla de Unit 41/48: el **override** del pool si existe, si no la **global heredada**. Se obtiene reusando `buildDayGroups` (que ya resuelve `override ?? global` y computa `preJoin`/`hidden`). No se duplica la lógica de resolución.

### BR-61.4 — `preJoin` respetado (Unit 56)
Una celda `(miembro, partido)` con `partido.kickoffAt < miembro.joinedAt` se muestra **vacía** con `CalendarOff` + "Aún no estaba en la liga" (BR-56.1), igual que en la grilla. Aplica a todos incl. el viewer. El estado `hidden` (Unit 53, predicción futura de otro) **no aplica** porque LIVE ⇒ `kickoffAt <= now` ⇒ started ⇒ visible según BR-41.2; pero la celda se construye desde el mismo `buildDayGroups` por simplicidad y consistencia (un partido LIVE nunca produce `hidden`).

### BR-61.5 — Puntos mientras LIVE
Mientras el partido esté `LIVE` (no scoreado), `totalPoints` es `null` → el banner muestra "—" (pendiente), igual que la grilla (BR-41.5). Cuando el sync puntúa (LIVE→FINISHED), el refresco en vivo actualiza el badge de puntos.

### BR-61.6 — CTA y `?tab` URL-driven (supersede BR-41.7)
Cada partido del banner ofrece un CTA «Ver en Predicciones» que lleva a `?tab=predictions&page=N`, donde `N = pageForDayKey(dayKey, allDays, timeZone)` (nuevo helper en `pool-predictions-view-helpers.ts`). La pestaña activa pasa a reflejarse en `?tab` (default `ranking`). **Supersede BR-41.7**: la pestaña deja de ser client-only sin param de URL; ahora es URL-driven para permitir deep-link desde el banner. El comportamiento de un clic normal en una pestaña se conserva (cambia `?tab` vía `router.replace` sin recarga completa). El paginado sigue vía `?page` (Unit 48, sin cambios).

### BR-61.7 — Refresco en vivo y degradación
`useLiveResults()` (Unit 58) se monta **una sola vez** en `PoolDetailTabs` (el wrapper de los `<Tabs>`), de modo que el banner y el grid se refrescan estés en la pestaña que estés. Se **elimina** la suscripción duplicada de `PoolPredictionsView` (que ahora hereda el refresco del wrapper). Si Realtime no está disponible o falta config, `useLiveResults` no hace nada (BR-58.6) y todo funciona con refresco manual.

## 3. Business Logic Model

### BL-61.1 — `page.tsx` (server, refactor mínimo)
`src/app/(app)/pools/[id]/page.tsx`. Tras `Promise.all([getPoolDetail, getPoolLeaderboard, getPoolMemberPredictions])`, calcula `liveMatches = predictionsData.matches.filter(m => m.matchStatus === "LIVE")` y pasa al nuevo contenedor cliente `PoolDetailTabs`:
- `pool`, `liveMatches`, `predictions`, `matches`, `members`, `poolId`, `viewerId`, `initialPage`, `initialTab` (de `searchParams.tab`, default `"ranking"`),
- y como **children/props** el contenido server-renderizado de cada pestaña (`PoolLeaderboard`, `MemberList`, `PoolPredictionsView`, el `aside` con `InviteShare`/`DirectedInviteForm`/`PoolSettingsCard`/`PoolActions`).

El `aside` (sidebar) se mantiene **fuera** de los `<Tabs>` (como hoy), junto al banner.

### BL-61.2 — `PoolDetailTabs` (nuevo cliente)
`src/features/pools/components/pool-detail-tabs.tsx`. Wrapper de los `<Tabs>`:
- `useLiveResults()` (Unit 58) — **una** suscripción para todo el detalle.
- Lee `tab` de `useSearchParams()` (default `"ranking"`); `<Tabs value={tab} onValueChange={(v) => router.replace(\`?tab=${v}\`)}>` (preserva `?page` cuando existe).
- Renderiza `<PoolLiveNowBanner liveMatches predictions members poolId viewerId timeZone locale />` arriba de los `<Tabs>`.
- Pasa los children/props server a cada `<TabsContent>`.

### BL-61.3 — `PoolLiveNowBanner` (nuevo cliente)
`src/features/pools/components/pool-live-now-banner.tsx`. Si `liveMatches.length === 0` → retorna `null`.
- Construye `allDays = buildDayGroups(predictions, members, locale, timeZone, matches)` (Unit 41/56) **una vez**, memoizado.
- Por cada `liveMatch`: encuentra su `DayGroup` y su `MatchColumn`, renderiza una card con:
  - Cabecera: equipos, banderas (`TeamFlag` reusado), marcador en vivo (`${homeScore} - ${awayScore}`), `MatchStatusBadge status="LIVE"`.
  - Cuerpo: `members.map(m => <MemberPredictionRowView cell members ... />)` — **extraído** de `MatchCard` (`pool-predictions-view.tsx`) para reusar la rama `preJoin`/predicción/puntos/badge override. Para el banner, `canEdit` siempre `false` (no se edita desde el banner).
  - CTA «Ver en Predicciones» → `router.push(\`?tab=predictions&page=${pageForDayKey(day.dayKey, allDays, timeZone)}\`)`.

### BL-61.4 — `pageForDayKey` (nuevo helper puro)
`src/features/pools/components/pool-predictions-view-helpers.ts`. `pageForDayKey(dayKey: string, allDays: DayGroup[], timeZone: string): number`. Replica la lógica de `paginateDays` (default = hoy, sino página 0) pero resuelve la página de un `dayKey` arbitrario: `Math.floor(days.findIndex(d => d.dayKey === dayKey) / DAYS_PER_PAGE)`. Si no encuentra el día → `0`. Reusa `DAYS_PER_PAGE` y el orden de `allDays`.

### BL-61.5 — Extracción de `MemberPredictionRowView`
`pool-predictions-view.tsx`: el bloque `members.map((member) => …)` dentro de `MatchCard` (líneas ~104-189) se extrae a un componente `MemberPredictionRowView({ cell, member, viewerId, t, canEdit, onStartEdit, onStartDualSave, onReset, matchId })`. `MatchCard` lo consume sin cambios; `PoolLiveNowBanner` lo consume con `canEdit={false}` y los handlers en no-op. Sin cambio de comportamiento en el grid.

## 4. Contratos / cambios de código

| Archivo | Cambio |
|---|---|
| `src/features/pools/components/pool-detail-tabs.tsx` | **NEW** — wrapper cliente de `<Tabs>`: `useLiveResults()` una vez, `?tab` URL-driven, monta el banner arriba. |
| `src/features/pools/components/pool-live-now-banner.tsx` | **NEW** — banner cross-tab; `liveMatches.length === 0` → `null`; por partido: cabecera (equipos/flags/marcador/LIVE badge) + lista `MemberPredictionRowView` + CTA. |
| `src/app/(app)/pools/[id]/page.tsx` | **REFACTOR** — calcula `liveMatches`, pasa todo a `PoolDetailTabs`; `initialTab` desde `searchParams.tab`. El `aside` sigue fuera de los `<Tabs>`. |
| `src/features/pools/components/pool-predictions-view.tsx` | Extrae `MemberPredictionRowView` de `MatchCard`; **elimina** su `useLiveResults()` (ahora en `PoolDetailTabs`). |
| `src/features/pools/components/pool-predictions-view-helpers.ts` | **NEW** helper `pageForDayKey(dayKey, allDays, timeZone)`. |
| `src/i18n/dictionaries/{es,en}.ts` | Keys `pools.liveNow.title` ("En vivo ahora"/"Live now"), `pools.liveNow.viewInPredictions` ("Ver en Predicciones"/"View in Predictions"), `pools.liveNow.noLive` (no usada en UI pero reservada para a11y). |
| `src/features/pools/components/__tests__/pool-live-now-banner.test.tsx` | **NEW** — renderiza con LIVE (cabecera + miembros + CTA), oculto sin LIVE, `preJoin` (CalendarOff), puntos `null` → "—". |
| `src/features/pools/components/__tests__/pool-detail-tabs.test.tsx` | **NEW** — `?tab=predictions` → tab activa predictions; sin `?tab` → default `ranking`; `onValueChange` actualiza `?tab`. |

## 5. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| SECURITY-01 (input) | COMPLIANT | Sin nueva superficie de input; el banner solo lee props del server. |
| SECURITY-08 (autorización) | COMPLIANT | Reusa el gate de membresía existente de `getPoolDetail`/`getPoolMemberPredictions` (`getCurrentUserId`); sin nuevos endpoints/actions. El CTA solo cambia `?tab`/`?page` (client-side). |
| SECURITY-13 (confidencialidad) | COMPLIANT | El enmascarado anti-sesgo de Unit 53 se mantiene server-side; un partido LIVE ya started ⇒ visible según BR-41.2, sin fuga. `preJoin` (Unit 56) se respeta. |
| Realtime (Unit 58) | COMPLIANT | `useLiveResults` solo señal `{at}` (BR-58.1); sin datos/PII en el broadcast. |
| Secrets | COMPLIANT | Sin secretos nuevos; reusa `NEXT_PUBLIC_SUPABASE_*` existentes. |

## 6. Verificación

| Check | Método |
|---|---|
| Tipos / lint | `tsc --noEmit` 0, Biome limpio (archivos tocados), ESLint 0 (warning `<img>` preexistente en `TeamFlag`). |
| Unit tests | `pool-live-now-banner.test.tsx` (renderiza con LIVE / oculto sin LIVE / `preJoin` / puntos `null`), `pool-detail-tabs.test.tsx` (`?tab` control / default), `pool-predictions-view.test.tsx` ajustado (sin `useLiveResults` propio), helper `pageForDayKey`. **Vitest suite completa.** |
| Build | `pnpm build` OK. |
| Manual | `/pools/[id]` en Clasificación con un partido LIVE → banner con marcador + predicciones de los miembros; CTA → salta a Predicciones en el día correcto; forzar resultado (`/admin/matches`) → banner desaparece al pasar a FINISHED; sin LIVE → sin banner. |

## 7. Out of Scope

- Fijar LIVE arriba del grid dentro de Predicciones (alternativa descartada por el usuario).
- Banner en `/matches` o `/rankings` (esta unit es solo `/pools/[id]`).
- Countdown o minuto del partido en el banner.
- Notificación push al entrar un partido LIVE (Unit 10 cubre `match_start`).
- Sincronización del reloj cliente-servidor (innecesaria; el estado LIVE lo dicta el server).
