# Integration Test Instructions

> La suite automatizada actual es de **unit tests** (vitest). Las integraciones entre units se validan hoy de forma **manual** contra el dev server; Playwright está instalado para añadir e2e en hardening. Aquí se documentan los escenarios clave cross-unit.

## Setup
```bash
# 1. Servicios locales (Supabase + Mailpit)
supabase start
docker compose up -d            # Mailpit (8025/1025)

# 2. Migraciones + seed
supabase db reset               # aplica migraciones
pnpm tsx scripts/seed-avatars.ts
pnpm tsx scripts/seed-admin.ts <email>     # promover un usuario a ADMIN

# 3. App
pnpm dev
```
Variables: `.env` con claves Supabase/Resend; `API_FOOTBALL_KEY` opcional; `WORLD_CUP_KICKOFF` para probar congelamiento.

## Escenarios de integración

### S1 — Auth → Profile → Onboarding (Unit 1 + 2)
Registro/login → onboarding (nickname → avatar → **reglas** → passkey) → landing. Verifica gating de `proxy.ts` y el paso de reglas de Unit 2.

### S2 — Pools → Membership → Landing preview (Unit 3 → Unit 2)
Crear pool público → aparece en `/pools/discover` y en el `PoolPreview` de la landing (interfaz `PoolPreviewItem`). Unirse por código/link; expulsar/salir/archivar.

### S3 — Account deletion → Pool ownership transfer (Unit 3 → Unit 1)
Borrar cuenta de un admin de pool con miembros → el modal pide nuevo owner (orden más antiguo→nuevo); pool unipersonal se elimina.

### S4 — Competition sync → Fixture (Unit 4 → Unit 5)
Seed/sync de la competición activa → `/matches` muestra fixture por fases; estados de partido y bloqueo por kickoff.

### S5 — Predictions → Scoring → Leaderboard (Unit 5 → 6)
Predecir partidos → forzar/llegar a FINISHED → `scoreMatch` puntúa → `/pools/[id]/leaderboard` ordena por puntos (dense "1,1,2") y la vista de predicción muestra el desglose (`ScoreBreakdownExplainer`).

### S6 — Admin override → Re-score (Unit 7 → Unit 6)
Como ADMIN, `/admin/matches` → forzar resultado → re-cálculo síncrono refleja puntos en el leaderboard. Revertir override. Dashboard `/admin` muestra runs de sync y "Sincronizar ahora".

### S7 — Admin gating (Unit 7 → Unit 1)
Usuario no-ADMIN navegando a `/admin/*` → redirigido a `/` (proxy) y las queries/actions devuelven no-autorizado (`getAdminUserId`).

## Integraciones diferidas (hardening — documentadas, no bloqueantes)
- **Sweeper post-sync real**: invocar `scoreFinishedUnscoredMatches()` desde el entrypoint de sync de producción (la edge function `competition-sync` es un scaffold de Deno).
- **Provider real**: `ApiFootballProvider` devuelve payload vacío (MVP); cablear llamadas reales a API-Football.
- **CSP enforce**: pasar la CSP de report-only a enforce (hash del theme script ya documentado).
