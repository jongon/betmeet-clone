# Functional Design — Unit 50: Sync & Scoring Automáticos (Crons)

> Refine post-construcción (2026-06-18) que **resuelve `FR-06`** (TBD). Automatiza el sync de
> partidos y el cálculo de puntos con **Supabase pg_cron + pg_net** golpeando una ruta HTTP
> autenticada, reusando la orquestación que hoy ejecuta el admin manualmente (`triggerSync`).
> **No reinicia** Units 1–49. Sin cambios de schema en tablas de la app (solo extensiones
> pg_cron/pg_net + secretos en Vault).

## 1. Traceability

| ID | Source | Description |
|---|---|---|
| FR-06 | requirements.md | Jobs programados — RESUELTO por esta unidad |
| FR-REFINE-50.1 | Épica 50 | Ruta `POST /api/cron/sync` autenticada por `x-sync-secret` |
| FR-REFINE-50.2 | Épica 50 | Orquestación compartida `runScheduledSync(scope, { source })` |
| FR-REFINE-50.3 | Épica 50 | Cadencia tiered en pg_cron + pg_net (Vault) |
| FR-REFINE-50.4 | Épica 50 | Short-circuit de cuota en el tier `LIVE_STATUS` |
| US-50.1 | stories.md | Marcadores y puntos se actualizan solos |
| US-50.2 | stories.md | No malgastar cuota cuando no hay partidos |
| DD-50.1…50.4 | Épica 50 | Decisiones de diseño |

## 2. Problema

El sync (football-data.org) y el scoring solo corren cuando un admin pulsa "Sincronizar ahora"
en `/admin` (`triggerSync`, `src/features/admin/actions/trigger-sync.ts`). Durante el Mundial
esto obliga a intervención humana cada pocos minutos para reflejar marcadores en vivo y puntos.

## 3. Decisión de diseño

- **DD-50.1** — La ruta cron reusa la **misma cadena** que el admin (sync → scoring → dispatch);
  no se reimplementa lógica de dominio.
- **DD-50.2** — Se extrae `runScheduledSync` como única fuente de la orquestación. El admin y el
  cron solo difieren en autorización (admin vs. secreto) y en el `source` del `windowKey`.
- **DD-50.3** — Scheduler = **Supabase pg_cron + pg_net** (no Vercel Cron ni externo):
  independiente del plan de Vercel; el secret guard ya existía (`/api/notifications/dispatch`).
- **DD-50.4** — El tier `LIVE_STATUS` (cada 2 min) hace short-circuit cuando no hay partidos en
  vivo/inminentes, para respetar el presupuesto de 10 req/min del proveedor.

## 4. Domain Entities

Sin cambios en entidades/tablas de la app. Se reusan `Match`, `Prediction`, `PredictionScore`,
`ProviderSyncRun` (cuyo `windowKey` ahora distingue `manual-…` de `cron-…`). A nivel de
infraestructura de BD se añaden las extensiones `pg_cron` y `pg_net` y dos secretos en
**Supabase Vault** (`app_base_url`, `sync_trigger_secret`).

## 5. Business Rules

| ID | Regla | Trazabilidad |
|---|---|---|
| BR-50.1 | `POST /api/cron/sync` exige header `x-sync-secret` == `SYNC_TRIGGER_SECRET`; en su defecto → `401`. | FR-REFINE-50.1 |
| BR-50.2 | Scopes válidos: `FIXTURES, LIVE_STATUS, RESULTS, FULL, CLEANUP`. Inválido/ausente → `400`. | FR-REFINE-50.1 |
| BR-50.3 | `runScheduledSync` para scope de proveedor: `runCompetitionSync` → `scoreFinishedUnscoredMatches` → best-effort `dispatchPendingNotifications`. | FR-REFINE-50.2 |
| BR-50.4 | `runScheduledSync("CLEANUP")` ejecuta `cleanupOldSyncRuns(now)` sin tocar el proveedor. | FR-REFINE-50.2 |
| BR-50.5 | `windowKey = "<source>-<scope>-<YYYY-MM-DD>"` (source ∈ `manual` \| `cron`). | FR-REFINE-50.2 |
| BR-50.6 | El sync automático respeta el lock de `ProviderSyncRun` (Unit 4) y los guards de no-regresión/freeze de override (Unit 46) — heredados del orquestador. | FR-REFINE-50.2 |
| BR-50.7 | El tier `LIVE_STATUS` hace short-circuit (`{ ok, skipped: true }`, sin llamar al proveedor) cuando `hasActiveMatchWindow()` es falso (sin partidos LIVE/LOCKED ni kickoff ±3h). Aplica solo a la ruta cron. | FR-REFINE-50.4 |
| BR-50.8 | Fallo de sync en la ruta → `502` con `{ ok:false, scope, error }`. Éxito de scope de proveedor → revalida vistas (`adminDashboard`) **best-effort** (try/catch: `next/cache` puede lanzar en un Route Handler y no debe romper el run ya persistido). `CLEANUP` no revalida. Error no controlado → `500` con `{ ok:false, scope, error: message }` (cuerpo con el mensaje, para diagnóstico). | FR-REFINE-50.1 |
| BR-50.9 | El sync manual de `/admin` se conserva; el caso feliz es idéntico (delega en `runScheduledSync(scope, { source: "manual" })`). | FR-REFINE-50.2 |
| BR-50.10 | El middleware (`src/proxy.ts`) hace early-return para rutas `/api/*`: se autentican solas (guard `x-sync-secret`, o CSP reports sin sesión). Sin esto, el gate de sesión redirige `POST /api/cron/sync` a `/sign-in` (307) y la ruta nunca corre. | FR-REFINE-50.1 |
| BR-50.11 | El guard solo aplica si `SYNC_TRIGGER_SECRET` está definido (`if (expected)`). Si la env var falta en el entorno (p. ej. Vercel), la ruta queda **abierta** → debe configurarse en prod (ver runbook §7). | FR-REFINE-50.1 |

## 6. Business Logic Model

```
# BL-50.1 — runScheduledSync(scope, { source = "cron" })
if scope == CLEANUP: cleanupOldSyncRuns(now); return { ok: true }
if scope not in {FIXTURES, LIVE_STATUS, RESULTS, FULL}: return { ok:false, error:"Scope inválido" }
try:
  windowKey = `${source}-${scope}-${today}`
  runCompetitionSync(FootballDataProvider, scope, { windowKey })
  scoreFinishedUnscoredMatches()
except FOOTBALL_DATA_KEY_MISSING: return { ok:false, error:"Falta configurar FOOTBALL_DATA_KEY…" }
except *: return { ok:false, error:"La sincronización falló…" }
try: dispatchPendingNotifications()  # best-effort
except: pass
return { ok: true }

# BL-50.2 — POST /api/cron/sync
if SYNC_TRIGGER_SECRET set and header x-sync-secret != it: 401
scope = query.scope; if scope not in ALLOWED: 400
if scope == LIVE_STATUS and not hasActiveMatchWindow(): return { ok:true, scope, skipped:true }
result = runScheduledSync(scope, { source: "cron" })
if not result.ok: 502 { ok:false, scope, error }
if scope != CLEANUP: revalidateResultViews({ adminDashboard: true })
return { ok:true, scope }

# BL-50.3 — hasActiveMatchWindow(now)
count = Match where status in (LIVE, LOCKED) OR kickoffAt within [now-3h, now+3h]
return count > 0
```

## 7. Components

| Componente | Tipo | Contrato |
|---|---|---|
| `runScheduledSync(scope, { source? })` | Service (NUEVO) | `→ { ok: boolean; error?: string }`. Orquestación compartida. |
| `hasActiveMatchWindow(now?)` | Service (NUEVO) | `→ boolean`. ¿Hay partido en vivo/inminente? |
| `POST /api/cron/sync` | Route Handler (NUEVO) | Query `scope`; header `x-sync-secret`; JSON `{ ok, scope, error?/skipped? }`. |
| `triggerSync(scope)` | Server Action (MOD) | Delega en `runScheduledSync(scope, { source:"manual" })`. |

## 8. Schema Delta

Sin cambios de schema en tablas de la app. Migración Prisma de infraestructura:

```
prisma/migrations/20260618120000_unit50_cron_sync_scoring/migration.sql
```

- `create extension if not exists pg_cron; create extension if not exists pg_net;`
- 4 `cron.schedule(...)` (idempotentes vía `cron.unschedule` previo por `jobname`):
  `sync-live-status */2`, `sync-results */5`, `sync-fixtures 0 6`, `sync-cleanup 0 4` (UTC).
- Cada job: `net.http_post(url := <app_base_url>/api/cron/sync?scope=…,
  headers := jsonb_build_object('x-sync-secret', <sync_trigger_secret>))` con valores leídos de
  `vault.decrypted_secrets` (sin secretos en el repo).
- **Defensiva**: si pg_cron/pg_net no están disponibles (local/CI) la migración hace no-op vía
  `pg_available_extensions` + `exception when insufficient_privilege`, manteniendo
  `prisma migrate deploy` verde en todos los entornos.

## 9. i18n Keys

Ninguna. La ruta es server-to-server; no hay UI nueva.

## 10. File Plan

**Nuevos archivos**
```
src/features/competition/services/run-scheduled-sync.ts
src/features/competition/services/__tests__/run-scheduled-sync.test.ts
src/app/api/cron/sync/route.ts
src/app/api/cron/sync/__tests__/route.test.ts
prisma/migrations/20260618120000_unit50_cron_sync_scoring/migration.sql
```
**Archivos modificados**
```
src/features/admin/actions/trigger-sync.ts        # delega en runScheduledSync
src/proxy.ts                                       # early-return /api/* (BR-50.10, fix de deploy)
.env.example                                       # SYNC_TRIGGER_SECRET + nota Vault
aidlc-docs/operations/operations-runbook.md        # §7 Crons + checklist
```
**Sin cambios**: orquestador de sync, sweeper de scoring, provider, dispatcher, schema de app,
`/matches`, auth, onboarding, UI.

> **Fixes detectados en el primer deploy a prod (2026-06-19)**: (1) el middleware redirigía
> `/api/cron/sync` a `/sign-in` (307) → BR-50.10; (2) `revalidateResultViews` lanzaba en el Route
> Handler → ahora best-effort + handler con try/catch que devuelve el error en el body (BR-50.8);
> (3) `SYNC_TRIGGER_SECRET` debe estar en el entorno de Vercel, no solo en Vault, o el guard se
> salta (BR-50.11). Verificado en prod: key inválida → 401, `RESULTS`/`LIVE_STATUS` → 200.

## 11. Security Baseline Compliance

| Control | Estado | Razón |
|---|---|---|
| RULE-SEC-AUTHZ | COMPLIANT | Ruta guarded por `x-sync-secret` (mismo patrón que dispatch). El admin mantiene `getAdminUserId()`. |
| RULE-SEC-SECRETS | COMPLIANT | Secreto y URL en **Supabase Vault**; no se hardcodean en SQL ni en el repo (resuelve riesgo tipo H-7). |
| RULE-SEC-INPUT | COMPLIANT | Único input externo es `scope` (allowlist) + el header del secreto. |
| RULE-SEC-RLS | COMPLIANT | Reusa la conexión/rol y los accesos del orquestador existente; sin nueva superficie de datos. |
| RULE-SEC-REGRESSION | COMPLIANT | Guards de Unit 46 (no-regresión/freeze) aplican al sync automático — críticos sin supervisión humana. |

## 12. Verification Plan

- **Tests**: `run-scheduled-sync.test.ts` (encadenado por scope, CLEANUP, KEY_MISSING, dispatch
  best-effort, `hasActiveMatchWindow`), `route.test.ts` (401/400/200/502 + skip de LIVE_STATUS),
  `trigger-sync.test.ts` verde tras el refactor.
- **Verificación estándar**: `tsc` 0, Biome limpio (archivos nuevos), ESLint 0, Vitest todos en
  verde, `pnpm build` OK con la ruta `/api/cron/sync` registrada.
- **Manual local**: `curl -X POST -H "x-sync-secret: $SYNC_TRIGGER_SECRET"
  ".../api/cron/sync?scope=RESULTS"` → `{ ok: true }`; sin secreto → 401.
- **Prod (Supabase)**: habilitar pg_cron/pg_net, crear los 2 secretos en Vault, `migrate deploy`,
  verificar `select * from cron.job` (4 jobs) y `cron.job_run_details` con `succeeded`.

## 13. Out of Scope

- Cambiar el proveedor o el motor de scoring.
- Vercel Cron / scheduler externo (descartado a favor de pg_cron).
- Notificaciones nuevas (se reusa `dispatchPendingNotifications`).
- Materialización de totales / cambios de performance (cubierto por Unit 49).
