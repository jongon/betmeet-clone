# Unit 7: Admin and Observability — Business Rules

> Identificador `BR-7.x`.

---

## Autorización

| ID | Regla |
|---|---|
| **BR-7.1** | Solo usuarios con `verificationStatus === 'ADMIN'` acceden a `/admin/*` y a las acciones admin. Doble defensa: gating en `proxy.ts` (redirección de no-admins) **y** `requireAdmin()` server-side en cada acción/consulta. |

## Forzar resultado (US-6.2, Q1)

| ID | Regla |
|---|---|
| **BR-7.2** | El override fija `homeScore`/`awayScore` (enteros ≥ 0), opcionalmente penales y ganador (knockout), pone `status = FINISHED`, `manualOverride = true`, y registra `overriddenByUserId`, `overriddenAt`, `manualOverrideReason` (1–500). |
| **BR-7.3** | En knockout con marcador **empatado**, `penaltyWinnerTeamId` es **obligatorio** (debe ser home o away) para que aplique el bonus de penales del scoring. En no-empate o fase de grupos no se pide. |
| **BR-7.4** | Solo se puede forzar el resultado de un partido con equipos definidos (`homeTeamId` y `awayTeamId` presentes); no se fuerza sobre un partido con placeholders. |
| **BR-7.5** | Tras forzar el resultado se dispara **`scoreMatch(matchId)` de forma síncrona** (recalcula a todos los usuarios), en la misma operación (US-6.2 AC, Q1). |

## Precedencia override vs API (Q2 = "La API gana")

| ID | Regla |
|---|---|
| **BR-7.6** | El override es un **fallback transitorio**: el sync de la API **prevalece**. En su próxima ejecución, `upsertMatch` (Unit 4) sobrescribe el marcador/estado del partido con los datos del proveedor. **No** se modifica `upsertMatch` (ya sobrescribe). |
| **BR-7.7** | Cuando un sync sobrescribe un partido previamente forzado, el re-score lo realiza el **barredor post-sync** (`scoreFinishedUnscoredMatches`, Unit 6). El flag `manualOverride`/auditoría permanecen como registro histórico aunque el dato provenga ya de la API. |

## Revertir override (Q4)

| ID | Regla |
|---|---|
| **BR-7.8** | El admin puede **revertir** un resultado forzado: limpia `manualOverride` (→ false) y la auditoría de override, devolviendo el control a la API (futuros syncs actualizan el partido con normalidad). |
| **BR-7.9** | Tras revertir, se re-dispara `scoreMatch(matchId)` con el estado actual del partido (re-puntúa o limpia los scores si el partido ya no es puntuable). |

## Dashboard de sincronización (US-6.1, Q3)

| ID | Regla |
|---|---|
| **BR-7.10** | El dashboard muestra la **última sincronización exitosa por scope** y los **runs recientes** (estado, timestamps, items, error). Fuente: `ProviderSyncRun`. |
| **BR-7.11** | El admin puede **"Sincronizar ahora"**: dispara `runCompetitionSync` para un scope y, al terminar, ejecuta el barredor de scoring (post-sync). La acción es idempotente respecto al lock de sync de Unit 4. |

## Observabilidad / seguridad

| ID | Regla |
|---|---|
| **BR-7.12** | Toda acción admin (override, revert, trigger sync) se registra con `auth-logger` (heredado de Unit 1) incluyendo el `userId` admin. |
| **BR-7.13** | Las acciones admin son **server-side**; se valida `requireAdmin()` antes de cualquier mutación (prevención de escalada de privilegios). |
