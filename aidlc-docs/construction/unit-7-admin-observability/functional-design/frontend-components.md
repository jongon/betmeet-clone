# Unit 7: Admin and Observability — Frontend Components

> Panel admin gated. Sobre los patrones de Units 1–6 (App Router, Server Components, shadcn/base-ui, Server Actions). Copy en español.

---

## Mapa de rutas

| Ruta | Acceso | Componente | Estado |
|---|---|---|---|
| `/admin` | ADMIN | `AdminDashboardPage` | Nuevo — dashboard de sync (US-6.1) |
| `/admin/matches` | ADMIN | `AdminMatchesPage` | Nuevo — lista + forzar/revertir resultado (US-6.2) |
| `proxy.ts` | — | gating `/admin/*` | **Modificado** — redirige no-admins |

---

## 1. AdminDashboardPage (`/admin`) — US-6.1

**Tipo**: Server Component; `getSyncDashboard()` (BL-4).

```
AdminDashboardPage
├── SyncStatusPanel
│   ├── LastSuccessByScope    (tarjetas: scope · última sync exitosa · items)
│   └── RecentRunsTable       (SyncRunRow[]: estado · inicio/fin · items · error)
└── TriggerSyncControls       (selector de scope + botón "Sincronizar ahora")  — BL-5
```

### TriggerSyncControls (cliente)
- Selector de scope (FIXTURES / LIVE_STATUS / RESULTS / FULL) + botón que llama `triggerSyncNow(scope)`.
- Estados: pending ("Sincronizando…"), éxito (refresca el panel), error (muestra mensaje).
- `data-testid="admin-sync-trigger"`, `admin-sync-scope`.

### RecentRunsTable
- Estado con color por `status` (SUCCESS/FAILED/RATE_LIMITED…). `data-testid="sync-run-{id}"`.

---

## 2. AdminMatchesPage (`/admin/matches`) — US-6.2

**Tipo**: Server Component; `getAdminMatches()` (BL-6).

```
AdminMatchesPage
└── AdminMatchList
    └── AdminMatchRow[]   (label `BRA vs ARG` · estado · marcador actual · badge "Override")
        ├── ForceResultDialog   (abre formulario)
        └── RevertOverrideButton (solo si isOverridden)
```

### Etiqueta de partido (refine Unit 34)
- `/admin/matches` muestra equipos resueltos con códigos `fifaCode` de 3 letras: `homeTeam.fifaCode + " vs " + awayTeam.fifaCode` (ej. `BRA vs ARG`).
- La misma etiqueta compacta se usa en la fila y en los diálogos/controles de override/reversión para evitar inconsistencias visuales.
- Si un lado aún no está resuelto, se conserva el placeholder existente de ese lado (`homePlaceholder`/`awayPlaceholder`), sin inventar códigos.
- Alcance limitado a admin: no cambia la presentación pública de `/matches`, predicciones ni rankings.

### ForceResultDialog (cliente) — BL-2
| Campo | Regla |
|---|---|
| `homeScore` / `awayScore` | enteros ≥ 0 (steppers) |
| `homePenaltyScore` / `awayPenaltyScore` | solo si knockout |
| `penaltyWinnerSelector` | visible solo si knockout **y** marcador empatado (BR-7.3) |
| `reason` | textarea 1–500 (obligatorio) |

- Submit → `forceMatchResult(matchId, input)`; al éxito refresca y muestra el nuevo marcador + badge override.
- `data-testid`: `force-result-{matchId}`, `force-result-home`, `force-result-away`, `force-result-reason`, `force-result-submit`.

### RevertOverrideButton (cliente) — BL-3
- Visible solo si `isOverridden`. Confirma y llama `revertMatchOverride(matchId)`.
- `data-testid="revert-override-{matchId}"`.

---

## 3. Gating (modifica Unit 1)

- **`proxy.ts`**: añadir `/admin` a rutas protegidas y, para `/admin/*`, verificar `verificationStatus === 'ADMIN'` (consulta a `profiles`); no-admin → redirección a `/` (o 404).
- **`requireAdmin()`** (`src/features/admin/services/require-admin.ts`) en cada acción/consulta (BR-7.1, BR-7.13).

---

## Server Actions / Queries

| Función | Tipo | Regla |
|---|---|---|
| `forceMatchResult(matchId, input)` | action | BL-2 / BR-7.2..7.5 |
| `revertMatchOverride(matchId)` | action | BL-3 / BR-7.8..7.9 |
| `triggerSyncNow(scope)` | action | BL-5 / BR-7.11 |
| `getSyncDashboard()` | query | BL-4 |
| `getAdminMatches()` | query | BL-6 |
| `requireAdmin()` | guard | BL-1 |

## Archivos nuevos/modificados (orientativo)

**Nuevos**:
```
src/features/admin/services/require-admin.ts
src/features/admin/queries.ts                 (getSyncDashboard, getAdminMatches)
src/features/admin/actions/{force-result,revert-override,trigger-sync}.ts
src/features/admin/schemas.ts                 (ForceResultSchema)
src/features/admin/types.ts                   (SyncStatusView, AdminMatchRow)
src/features/admin/components/{sync-status-panel,trigger-sync-controls,recent-runs-table,
  admin-match-list,force-result-dialog,revert-override-button}.tsx
src/app/admin/page.tsx
src/app/admin/matches/page.tsx
src/features/admin/__tests__/*                (require-admin, force-result resolveWinner, dashboard mapping)
```
**Modificados**:
```
src/proxy.ts   (gating /admin por rol ADMIN)
```

> Unit 7 **no** crea tablas ni migraciones (reutiliza Match override fields + ProviderSyncRun). **No** modifica `upsertMatch` (Q2=B: la API prevalece de forma natural).
