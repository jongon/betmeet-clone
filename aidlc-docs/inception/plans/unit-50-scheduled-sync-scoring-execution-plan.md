# Execution Plan — Unit 50: Sync & Scoring Automáticos (Crons)

## Status

- **Stage**: CONSTRUCTION — refine post-construcción (resuelve FR-06)
- **Unit**: 50 (siguiente número libre; Unit 49 = scoring-rankings performance)
- **Created**: 2026-06-18
- **Design Decisions**: DD-50.1…50.4 (ver abajo)
- **Approval Gate**: plan aprobado por el usuario (scheduler = Supabase pg_cron + pg_net; cadencia tiered)

## Intent

> "Quiero implementar Cron automatizados para sincronizar el estado de los partidos y calcular
> los puntos y no tenga que ir al admin a sincronizar manualmente."

Automatizar la cadena sync → scoring → dispatch que hoy ejecuta el admin manualmente
(`triggerSync`), sin intervención humana, conservando el sync manual como fallback.

## Design Decisions

| ID | Decisión |
|---|---|
| DD-50.1 | La ruta cron reusa la misma orquestación que el admin (no se reimplementa lógica). |
| DD-50.2 | Se extrae `runScheduledSync(scope, { source })`, compartido por admin y cron. |
| DD-50.3 | Scheduler = Supabase **pg_cron + pg_net** (no Vercel Cron ni externo); secretos en Vault. |
| DD-50.4 | Cadencia tiered (LIVE `*/2`, RESULTS `*/5`, FIXTURES `0 6`, CLEANUP `0 4` UTC) + short-circuit de cuota en LIVE_STATUS. |

## Workspace Detection Summary

- Next.js 16 (App Router) + Prisma 7 + PostgreSQL (Supabase), deploy en Vercel.
- Existe el patrón de ruta guarded por `SYNC_TRIGGER_SECRET` (`/api/notifications/dispatch`).
- Toda la orquestación ya está factorizada (sync-orchestrator, score-sweeper, dispatcher) y
  encadenada en `triggerSync`. No existía scheduler.

## Scope / Impact Assessment

- **User-facing**: marcadores en vivo y puntos se actualizan solos; el admin ya no necesita
  sincronizar manualmente (pero puede).
- **Affected behavior**: `triggerSync` ahora delega en `runScheduledSync`; runs etiquetados
  `cron-…` vs `manual-…` en `/admin`.
- **Not affected**: motor de scoring, proveedor, schema de tablas de la app, `/matches`, auth,
  onboarding, UI.
- **Risk**: bajo — reusa código probado; guards de Unit 46 protegen el sync no supervisado;
  migración pg_cron es idempotente y defensiva (no rompe local/CI).
- **Files**: ver §10 del functional-design (`unit-50-scheduled-sync-scoring/functional-design.md`).
