# Business Rules — Unit 28
## Persistencia de matches en sync-orchestrator

---

## BR-28.1 — Identificación de match (PRIMARY KEY del sync)
El campo `providerMatchId` es la clave primaria para todos los lookups del sync.
- Lookup: `prisma.match.findFirst({ where: { providerMatchId } })`
- Si se encuentra → UPDATE
- Si no se encuentra → aplicar BR-28.2

## BR-28.2 — Regla de creación por status
Un match solo se CREA si su status (del API) es `SCHEDULED` o `LIVE`.

| Status del API | Existe en BD | Acción |
|---|---|---|
| SCHEDULED | No | CREATE |
| LIVE | No | CREATE |
| FINISHED | No | SKIP (sin log) |
| POSTPONED | No | SKIP (sin log) |
| CANCELLED | No | SKIP (sin log) |
| SCHEDULED | Sí | UPDATE |
| LIVE | Sí | UPDATE |
| FINISHED | Sí | UPDATE (actualiza status + scores) |
| POSTPONED | Sí | UPDATE |
| CANCELLED | Sí | UPDATE |

**Rationale**: Evitar importar resultados históricos en una BD fresca.

## BR-28.3 — Campos a actualizar (UPDATE)
Al hacer UPDATE, se actualizan TODOS los campos disponibles:
- `status`
- `homeScore`, `awayScore` (si son null en API, se escribe null)
- `kickoffAt` (si viene del API, se actualiza; si no, se deja undefined)
- `homeTeamId`, `awayTeamId` (via lookup por fifaCode; null si no resuelto)
- `homePlaceholder`, `awayPlaceholder` (null en la mayoría de casos de este provider)

**Nota**: `providerMatchId`, `competitionId`, `phaseId`, `matchNumber` NO se cambian en UPDATE.

## BR-28.4 — `matchNumber` = null para matches del sync
Los matches creados por el sync tienen `matchNumber = null`.
El seed puede tener matches con `matchNumber` 1–104; el sync usa `providerMatchId` como clave.

## BR-28.5 — Resolución de phase (para CREATE)
Para crear un match, se necesita `phaseId`:
1. `phaseName` del match (ej. `"Group A"`, `"Round of 16"`) se busca en `phaseMap`.
2. Si la phase existe → usar su `id`.
3. Si la phase NO existe → `console.warn` + skip del match (BR-28.6).

## BR-28.6 — Matches no vinculables (silencio)
Si un match no puede ser creado/actualizado por:
- Phase no encontrada en el mapa
- Competition no encontrada en la BD

Acción: `console.warn(message)` + continuar con el siguiente match.
El `ProviderSyncRun` se marca SUCCESS de todas formas.

## BR-28.7 — TLA null/vacío
Si el API retorna `homeTeam.tla` con longitud ≠ 3, se trata como `null`.
Esto aplica para equipos no resueltos en knockout (`tla: ""` o `tla: null`).
El `homeTeamId` correspondiente quedará `null` en la BD.

## BR-28.8 — Notificaciones de status (best-effort)
Al hacer UPDATE de un match existente:
- Guardar el registro `previous` antes de actualizar.
- Llamar `emitMatchNotificationEvents(previous, saved)` después de `prisma.match.update()`.
- Si `emitMatchNotificationEvents` lanza → capturar y continuar (no bloquear el sync).

## BR-28.9 — Idempotencia
Múltiples syncs con los mismos datos producen el mismo estado final.
- Si el match ya existe con los mismos valores → el UPDATE es un no-op efectivo.
- No se crean registros duplicados (un solo registro por `providerMatchId`).

## BR-28.10 — itemsUpdated
`ProviderSyncRun.itemsUpdated` = número total de matches procesados exitosamente
(creados + actualizados). Los matches skipped (BR-28.2 o BR-28.6) no cuentan.

## BR-28.11 — seedCompetitionStructure() vs seedWorldCup2026()
- `seedCompetitionStructure()`: crea Competition + Phases + Teams. No crea Match records.
  Apto para BD fresca donde los matches vienen del sync.
- `seedWorldCup2026()`: llama a `seedCompetitionStructure()` + crea 104 match records
  (backward compatible con flujos existentes de test/dev que usen el seed completo).
- `scripts/seed-competition.ts` usa `seedCompetitionStructure()` (BD fresca para prod).
