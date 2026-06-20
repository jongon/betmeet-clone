# Functional Design — Unit 58: Resultados en vivo vía Supabase Realtime (websockets)

> Refine post-construcción (2026-06-20) vía `/aidlc:refine`. **Plan presentado y aprobado antes de ejecutar.** Refine sobre **Unit 50** (sync/scoring por cron), **Unit 52** (invalidación de caché Next.js 16) y la UI de resultados de **Unit 30/41/48/57**. **No reinicia** etapas aprobadas (Units 1–57 intactas).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-58.1 | requirements | Los resultados de `/matches` se actualizan en vivo sin recarga manual. |
| FR-REFINE-58.2 | requirements | La grilla de Predicciones de `/pools` se actualiza en vivo y muestra el marcador en vivo + badge LIVE en la cabecera de cada columna. |
| FR-REFINE-58.3 | requirements | El transporte es por WebSockets (Supabase Realtime); las actualizaciones nunca rompen la vista ni el sync/scoring si Realtime falla. |
| US-58.1 | stories | Como aficionado, veo el marcador actualizarse solo en `/matches` mientras el partido está en juego. |
| US-58.2 | stories | Como miembro de una liga, veo el marcador en vivo y los puntos actualizarse solos en la pestaña Predicciones del pool. |

## 1. Contexto y causa raíz

No existía mecanismo realtime alguno. El flujo de datos hoy:

1. El cron `sync-live-status` (`*/2 * * * *`, Unit 50) → `runScheduledSync("LIVE_STATUS")` → `runCompetitionSync` escribe `Match.homeScore/awayScore/status` (con los guards de override/terminal de Unit 46).
2. Tras el sync, `revalidateResultViews()` (Unit 35/52) invalida `COMPETITION_FIXTURE_TAG` + `RANKINGS_TAG` con `revalidateTag(tag, "max")` y revalida `/matches`, `/pools`, `/pools/[id]`, etc.
3. Pero el usuario **solo veía el cambio al navegar o recargar**: nada empujaba la actualización al cliente.

**Restricción de despliegue**: la app corre en **Vercel serverless**. Una función serverless **no puede mantener una conexión WebSocket abierta**, así que un servidor `ws`/`socket.io` propio no es viable. El camino WebSocket que encaja es **Supabase Realtime** (ya hay Postgres + Auth de Supabase y un cliente browser en `src/lib/supabase/client.ts`).

**Decisión de transporte (AskUserQuestion)**: **Supabase Realtime Broadcast** disparado server-side tras la invalidación de caché — frente a `postgres_changes` (exige replicación lógica + RLS sobre `Match` y emite un evento por fila) o polling (no es websockets). Broadcast emite **una** señal por sync, con orden garantizado respecto al `revalidateTag`, y sin tocar el esquema/RLS.

**Decisión de display en `/pools` (AskUserQuestion)**: **añadir el marcador en vivo + badge LIVE** a la cabecera de cada columna de partido (antes solo mostraba equipos + hora + predicción/puntos por miembro).

**Granularidad**: el dato sigue moviéndose al ritmo del cron (~2 min para `LIVE_STATUS`). Realtime elimina el refresco manual, no acelera la fuente.

## 2. Business Rules

### BR-58.1 — Señal, no datos
El broadcast `results-updated` transporta solo `{ at: <epoch ms> }`. No lleva marcadores, predicciones ni PII. El cliente re-obtiene los datos del servidor (que ya recalculó scoring/puntos), de modo que el servidor sigue siendo la única fuente de verdad.

### BR-58.2 — Broadcast después de invalidar la caché
La señal se emite **inmediatamente después** de `revalidateResultViews()` en cada punto que muta resultados. Así, cuando el cliente hace `router.refresh()`, el tag `COMPETITION_FIXTURE_TAG` ya está invalidado y la re-renderización lee datos frescos (evita el footgun stale-while-revalidate de Unit 52).

### BR-58.3 — Cobertura de los puntos de mutación
Se emite en los cuatro caminos que cambian un resultado: el cron `POST /api/cron/sync` (scopes ≠ `CLEANUP`), y las server actions admin `forceMatchResult`, `revertMatchOverride` y `triggerSync`.

### BR-58.4 — Best-effort, nunca bloqueante
`broadcastResultsUpdated` traga config ausente y cualquier error de red/HTTP (try/catch + log). Un fallo de Realtime **nunca** rompe sync, scoring ni la respuesta de la action/route. Se ejecuta server-side; un guard `typeof window` impide su uso accidental en el cliente con la service-role key.

### BR-58.5 — Refresco con debounce
El cliente coalescea ráfagas de broadcasts con un debounce de 1 s antes de `router.refresh()` (dentro de `startTransition`), dejando aterrizar la invalidación de caché y evitando refrescos múltiples.

### BR-58.6 — Degradación limpia
Si faltan las variables públicas de Supabase (p. ej. en tests o config incompleta), `useLiveResults` no hace nada y la vista funciona exactamente como antes (refresco manual). El marcador en vivo en `/pools` solo se muestra para partidos `LIVE` con marcador presente; los `FINISHED` siguen mostrando su marcador vía `sublabel` (Unit 41), sin cambios.

## 3. Business Logic Model

### BL-58.1 — `broadcastResultsUpdated()` (servidor)
`src/features/competition/services/broadcast-results-updated.ts`. POST al endpoint REST de Realtime `${NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast` con `apikey`/`Authorization: Bearer <service-role>`, body `{ messages: [{ topic: "live-results", event: "results-updated", payload: { at } }] }`. REST (no socket) porque la función serverless no mantiene conexión. Constantes del canal/evento en `src/features/competition/live-results-channel.ts` (módulo sin deps server/cliente, compartido por servidor y hook).

### BL-58.2 — `useLiveResults()` (cliente)
`src/features/competition/hooks/use-live-results.ts`. `createClient()` (browser) → `channel("live-results").on("broadcast", { event: "results-updated" }, …).subscribe()`. Al recibir, debounce 1 s → `startTransition(() => router.refresh())`. Cleanup: `clearTimeout` + `removeChannel` al desmontar. Si `createClient()` lanza por env ausente, retorna sin suscribirse (BR-58.6).

### BL-58.3 — Marcador en vivo en la cabecera de `/pools`
`MatchColumn` (en `pool-predictions-view-helpers.ts`) gana `homeScore`/`awayScore`; `buildDayGroups` los mapea desde `MatchView`. El componente `MatchCard` de `pool-predictions-view.tsx` calcula `liveScore` solo para `matchStatus === "LIVE"` con marcador presente y renderiza el marcador + `MatchStatusBadge status="LIVE"` (reusa el badge de `match-status-badge.tsx`). `buildMatchLabel` **no** cambia (su `sublabel` sigue siendo solo-FINISHED).

## 4. Contratos / cambios de código

| Archivo | Cambio |
|---|---|
| `src/features/competition/live-results-channel.ts` | **NEW** — constantes `LIVE_RESULTS_CHANNEL`/`RESULTS_UPDATED_EVENT`. |
| `src/features/competition/services/broadcast-results-updated.ts` | **NEW** — `broadcastResultsUpdated()` (REST broadcast, best-effort). |
| `src/features/competition/services/__tests__/broadcast-results-updated.test.ts` | **NEW** — POST correcto, no-op sin env, traga non-OK y errores de red. |
| `src/features/competition/hooks/use-live-results.ts` | **NEW** — hook de suscripción + debounce-refresh, resiliente. |
| `src/app/api/cron/sync/route.ts` | `await broadcastResultsUpdated()` tras `revalidateResultViews` (scopes ≠ CLEANUP). |
| `src/features/admin/actions/{force-result,revert-override,trigger-sync}.ts` | `await broadcastResultsUpdated()` tras `revalidateResultViews`. |
| `src/features/predictions/components/matches-fixture-view.tsx` | `useLiveResults()`. |
| `src/features/pools/components/pool-predictions-view.tsx` | `useLiveResults()` + marcador en vivo/badge LIVE en la cabecera. |
| `src/features/pools/components/pool-predictions-view-helpers.ts` | `MatchColumn.homeScore/awayScore` + mapeo en `buildDayGroups`. |
| `src/features/pools/components/__tests__/pool-predictions-view.test.tsx` | +1 caso (live-score en la columna). |

## 5. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| SECURITY-01 (input) | COMPLIANT | No añade superficie de input; el broadcast no acepta datos del cliente. |
| SECURITY-08 (autorización) | COMPLIANT | Los puntos de emisión siguen guarded (`getAdminUserId` / `x-sync-secret`). El refresco del cliente reusa las queries existentes con sus gates de membresía. |
| SECURITY-13 (confidencialidad) | COMPLIANT | El broadcast no lleva datos de resultado ni PII (solo `{at}`); el enmascarado anti-sesgo de Unit 53 sigue server-side. La service-role key solo se usa server-side (guard `typeof window`), nunca se expone al browser. |
| Secrets | COMPLIANT | Sin secretos nuevos en el repo; reusa `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_*` existentes. |

## 6. Verificación

| Check | Método |
|---|---|
| Tipos / lint | `tsc --noEmit` 0, Biome limpio (11 archivos), ESLint 0 (warnings `<img>` preexistentes). |
| Unit tests | `broadcast-results-updated.test.ts` (4) + caso live-score en `pool-predictions-view.test.tsx`. **Vitest 409/409**. |
| Build | `pnpm build` OK. |
| Manual | `/matches` y `/pools/[id]` en dos pestañas → forzar resultado (`/admin/matches`) o "sincronizar ahora" → ambas vistas se actualizan solas en ~1–2 s sin recargar. |
| Realtime | Verificar Realtime habilitado en Supabase (Realtime Inspector / log temporal en el hook). |

## 7. Out of Scope

- `postgres_changes` / replicación lógica + RLS sobre `Match`.
- Suscribirse solo dentro de la ventana de partido (gating por LIVE/kickoff ±3h).
- Acelerar la cadencia del cron (la fuente sigue a ~2 min).
- Presence/typing y reconexión avanzada del canal.
