# Unit 7: Admin and Observability — Functional Design Plan

## Unit
**Admin and Observability** — panel de administración: visibilidad del estado de sincronización y override manual de resultados (que re-dispara el scoring).

## Stories
- **US-6.1** Sincronización API-Football (visibilidad): dashboard con última conexión exitosa, partidos actualizados, estado de crons/webhooks.
- **US-6.2** Forzar Resultado (fallback): sobrescribir el marcador oficial; al cambiarlo se dispara el recálculo de puntos (US-5.1).

## Contexto existente
- **`VerificationStatus.ADMIN`** (Unit 1) + `scripts/seed-admin.ts`. **No** hay feature admin ni helper de gating todavía.
- **`Match`** (Unit 4) ya tiene `manualOverride`, `manualOverrideReason`, `overriddenByUserId`, `overriddenAt`, `homeScore`, `awayScore`, `homePenaltyScore`, `awayPenaltyScore`, `winnerTeamId`.
- **`ProviderSyncRun`** (Unit 4): runs de sync (status, startedAt/finishedAt, itemsFetched/Updated, errorMessage) — fuente del dashboard.
- **`upsertMatch`** (Unit 4) **NO** respeta `manualOverride` actualmente (sobrescribiría el override en cada sync) → relevante para Q2.
- **`scoreMatch`** (Unit 6): a invocar tras el override (re-cálculo).

## Dependencias / integraciones
- **Unit 1**: rol ADMIN; gating de `/admin/*`.
- **Unit 4**: lee `ProviderSyncRun`; **modifica** `upsertMatch` para respetar override (según Q2); puede disparar `runCompetitionSync` (trigger manual).
- **Unit 6**: el override invoca `scoreMatch` (re-cálculo).

## Decisiones ya fijadas (no requieren pregunta)
- Gating: `/admin/*` protegido en `proxy.ts` por `verificationStatus === ADMIN` + helper `requireAdmin()` en server actions; no-admins → 404/redirect.

## Clarification Questions (respondidas por selección en el chat)
- **Q1** — Forzar resultado + re-cálculo (US-6.2).
- **Q2** — Precedencia override vs API (¿el sync sobrescribe?).
- **Q3** — Alcance del dashboard de sync (US-6.1) + trigger manual.
- **Q4** — Reversión de override.

## Respuestas (vía selección en chat)
- **Q1** = Guardar + re-score **síncrono**.
- **Q2** = **La API gana** (override transitorio; sin cambios a `upsertMatch`).
- **Q3** = Dashboard **+ "Sincronizar ahora"**.
- **Q4** = **Sí**, acción "revertir a la API".

## Plan Checklist
- [x] Collect answers (via selección) and resolve ambiguities
- [x] Generate `domain-entities.md`, `business-logic-model.md`, `business-rules.md`, `frontend-components.md`
