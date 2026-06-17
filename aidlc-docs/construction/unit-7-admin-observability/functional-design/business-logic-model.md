# Unit 7: Admin and Observability — Business Logic Model

> Lógica técnico-agnóstica del panel admin. Reutiliza `scoreMatch` (Unit 6) y `runCompetitionSync` (Unit 4).

---

## BL-1: `requireAdmin()` — guard de autorización

```
function requireAdmin() -> userId | throw:
    userId = currentUserId()
    if userId == null: reject (no autenticado)
    profile = load Profile(userId)
    if profile.verificationStatus != 'ADMIN': reject (403)
    return userId
```
Usado por toda acción/consulta admin (BR-7.1, BR-7.13). El gating de ruta `/admin/*` en `proxy.ts` es la primera barrera.

---

## BL-2: `forceMatchResult(matchId, input)` (US-6.2, Q1)

```
function forceMatchResult(matchId, input):
    adminId = requireAdmin()
    match = load Match(matchId) with phase
    if match.homeTeamId == null or match.awayTeamId == null: reject (BR-7.4)

    validate input (scores ≥ 0; reason 1–500)                       // BR-7.2
    isKnockout = match.phase.type == 'KNOCKOUT'
    tied = input.homeScore == input.awayScore
    if isKnockout and tied and input.penaltyWinnerTeamId == null: reject (BR-7.3)
    // FR-REFINE-36.6: server-side derivation check
    if isKnockout and tied and penalty scores present:
        derived = derivePenaltyWinner(homePenaltyScore, awayPenaltyScore)
        expectedTeamId = match[derived == 'home' ? 'homeTeamId' : 'awayTeamId']
        if expectedTeamId != penaltyWinnerTeamId: reject

    winnerTeamId = resolveWinner(input, match)   // ganador por marcador, o penaltyWinner si knockout+empate

    transaction:
        update Match {
            homeScore, awayScore,
            homePenaltyScore, awayPenaltyScore (si knockout),
            winnerTeamId,
            status = FINISHED,
            manualOverride = true,
            manualOverrideReason = input.reason,
            overriddenByUserId = adminId,
            overriddenAt = now(),
        }
        scoreMatch(matchId)        // re-cálculo síncrono (BR-7.5)
    logAuthEvent("admin.match_overridden", { adminId, matchId })    // BR-7.12
```

`resolveWinner`: si `homeScore > awayScore` → home; `<` → away; si empate y knockout → `penaltyWinnerTeamId`; si empate y grupos → null.

---

## BL-3: `revertMatchOverride(matchId)` (Q4)

```
function revertMatchOverride(matchId):
    adminId = requireAdmin()
    update Match {
        manualOverride = false,
        manualOverrideReason = null,
        overriddenByUserId = null,
        overriddenAt = null,
    }
    scoreMatch(matchId)        // re-puntúa o limpia según estado (BR-7.9)
    logAuthEvent("admin.override_reverted", { adminId, matchId })
```
No borra el marcador (queda el último valor); devuelve el control a la API: el próximo sync lo actualiza con normalidad (BR-7.8).

---

## BL-4: `getSyncDashboard()` (US-6.1)

```
function getSyncDashboard() -> SyncStatusView:
    requireAdmin()
    lastSuccessByScope = por cada scope, el ProviderSyncRun más reciente con status SUCCESS
    recentRuns = últimos N ProviderSyncRun ordenados por startedAt desc
    return { lastSuccessByScope, recentRuns }
```

---

## BL-5: `triggerSyncNow(scope)` (Q3)

```
function triggerSyncNow(scope):
    adminId = requireAdmin()
    report = runCompetitionSync(provider, scope, currentWindow(scope))   // Unit 4
    scoreFinishedUnscoredMatches()                                       // Unit 6 (post-sync)
    logAuthEvent("admin.sync_triggered", { adminId, scope })
    return report
```
Respeta el lock de sync de Unit 4 (idempotente, BR-7.11).

---

## BL-6: `getAdminMatches(filter?)` (US-6.2)

```
function getAdminMatches(filter?) -> AdminMatchRow[]:
    requireAdmin()
    matches = Match (competición activa) ordenados por kickoffAt
    map a AdminMatchRow (label, status, scores, isOverridden, auditoría)
```

---

## Flujos de datos (resumen)

| Flujo | Origen | Transformación | Destino |
|---|---|---|---|
| Forzar resultado | Admin form | BL-2 (+ scoreMatch) | `Match`, `PredictionScore` |
| Revertir | Admin | BL-3 (+ scoreMatch) | `Match`, `PredictionScore` |
| Dashboard | `ProviderSyncRun` | BL-4 | `SyncStatusView` |
| Sincronizar ahora | Admin | BL-5 (sync + sweeper) | `Match`, `ProviderSyncRun`, `PredictionScore` |
| Lista de partidos | `Match` | BL-6 | `AdminMatchRow[]` |

## Integraciones

| Con | Qué |
|---|---|
| Unit 1 | rol ADMIN; `auth-logger`; gating `/admin/*` en `proxy.ts` |
| Unit 4 | `runCompetitionSync`; lectura de `ProviderSyncRun`; **no** se modifica `upsertMatch` (Q2=B) |
| Unit 6 | `scoreMatch` (override/revert), `scoreFinishedUnscoredMatches` (post-sync) |
