# Unit 7: Admin and Observability — Domain Entities

> Unit 7 **no introduce tablas nuevas**. Reutiliza entidades de Units 1/4/6 y añade read models para el panel admin.

---

## Entidades reutilizadas

| Entidad | Unit | Uso en Unit 7 |
|---|---|---|
| `Profile.verificationStatus` (`ADMIN`) | 1 | Autorización del panel y acciones admin (BR-7.1). |
| `Match` | 4 | Override manual: `homeScore`, `awayScore`, `homePenaltyScore`, `awayPenaltyScore`, `winnerTeamId`, `status`, **`manualOverride`**, `manualOverrideReason`, `overriddenByUserId`, `overriddenAt`. |
| `ProviderSyncRun` | 4 | Fuente del dashboard: `provider`, `scope`, `status`, `startedAt`, `finishedAt`, `itemsFetched`, `itemsUpdated`, `errorMessage`. |
| `scoreMatch` | 6 | Re-cálculo tras override/revert (US-6.2). |
| `runCompetitionSync` | 4 | Trigger manual "Sincronizar ahora" (Q3). |
| `scoreFinishedUnscoredMatches` | 6 | Re-score post-sync tras el trigger manual. |

> **Auditoría de overrides**: los campos `overriddenByUserId` / `overriddenAt` / `manualOverrideReason` del propio `Match` **son** el registro de auditoría (no se crea tabla aparte; Q3=A, no C).

---

## Read models (no persistidos)

### SyncStatusView (US-6.1)
| Atributo | Tipo | Descripción |
|---|---|---|
| `lastSuccessByScope` | `{ scope, finishedAt, itemsUpdated }[]` | Última sync **exitosa** por scope (TEAMS/FIXTURES/LIVE_STATUS/RESULTS/...). |
| `recentRuns` | `SyncRunRow[]` | Últimos N runs (cualquier estado). |

### SyncRunRow
| Atributo | Tipo |
|---|---|
| `scope` | string |
| `status` | `STARTED \| SUCCESS \| PARTIAL_SUCCESS \| FAILED \| RATE_LIMITED \| SKIPPED_LOCKED` |
| `startedAt` / `finishedAt` | string (ISO) |
| `itemsFetched` / `itemsUpdated` | number |
| `errorMessage` | string \| null |

### AdminMatchRow (US-6.2)
| Atributo | Tipo | Descripción |
|---|---|---|
| `id` | string | Match id. |
| `label` | string | "Local vs Visitante" (o placeholders). |
| `phaseType` | `GROUP \| KNOCKOUT \| LEAGUE` | Define si pide ganador de penales. |
| `status` | MatchStatus | Estado actual. |
| `homeScore` / `awayScore` | number \| null | Resultado actual. |
| `isOverridden` | boolean | `manualOverride === true`. |
| `overriddenBy` / `overriddenAt` | string \| null | Auditoría. |
| `kickoffAt` | string \| null | Para ordenar/contexto. |

### ForceResultInput
| Atributo | Tipo | Reglas |
|---|---|---|
| `homeScore` / `awayScore` | int ≥ 0 | Marcador oficial forzado. |
| `homePenaltyScore` / `awayPenaltyScore` | int ≥ 0 \| null | Solo knockout. |
| `penaltyWinnerTeamId` | uuid \| null | Requerido si knockout **y** marcador empatado (BR-7.3). |
| `reason` | string (1–500) | Motivo del override (auditoría, BR-7.2). |
