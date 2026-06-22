# Functional Design — Unit 60: partidos duplicados (27/28 jun) eliminados + bandera de Uruguay corregida

> Refine post-construcción (2026-06-22) vía `/aidlc:refine`. **Reparación de datos**, no de
> código fuente: el fix del código de Uruguay (`URU→URY`, commit `a2cfb96`) y el `ON DELETE
> CASCADE` de predicciones ya existían en `main`; lo que estaba mal era el **estado de la base de
> datos remota**. Refine sobre **Unit 4** (Competition Data — `teams`/`matches`) y **Unit 5**
> (Predictions). **Plan presentado y aprobado antes de ejecutar** (decisiones vía AskUserQuestion).
> **No reinicia** etapas aprobadas (Units 1–59).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-60.1 | requirements | La bandera de Uruguay se ve: una sola fila de equipo Uruguay (`URY`, `/flags/uy.svg`). |
| FR-REFINE-60.2 | requirements | Cada fixture del 27/28 jun aparece una sola vez; se elimina el duplicado con menos predicciones. |
| FR-REFINE-60.3 | requirements | Las predicciones enlazadas al partido eliminado se borran también. |
| FR-REFINE-60.4 | requirements | El partido que sobrevive conserva su número (`match_number`), sus etiquetas de knockout y su capacidad de recibir resultados en vivo (`provider_match_id`). |
| US-60.1 | stories | Como usuario, quiero ver la bandera de Uruguay correctamente en `/matches` y `/pools`. |
| US-60.2 | stories | Como usuario, quiero ver cada partido del 27/28 jun una sola vez, no duplicado. |
| BR-4.x | unit-4 | `teams` y `matches` son las entidades de datos de competición; FKs a `teams` desde `matches`/`predictions`. |
| BR-5.x | unit-5 | `predictions.match_id` → `matches(id)` con `ON DELETE CASCADE` (y `prediction_scores`). |

## 1. Intención del usuario

> *"La bandera de Uruguay no se ve."*
> *"Hay partidos que están repetidos desde las fechas 27 de junio y 28 de junio, elimina uno de
> ellos y elimina los que tienen menos predicciones y también sus predicciones enlazadas."*

**Diagnóstico (causa raíz), confirmado por inspección de la DB remota (Supabase, `DIRECT_URL`):**

1. **Uruguay.** Había **dos** filas en `teams`, ambas `provider_team_id=758`:
   `c8081262…` (`fifa_code=URU`, `flag_path=/flags/uru.svg`, **archivo inexistente** → imagen rota) y
   `58b14114…` (`fifa_code=URY`, `flag_path=/flags/uy.svg`, correcta). El fix de código `a2cfb96`
   alineó el seed a `URY`, pero nunca reconcilió el dato vivo; `team-badge.tsx` pinta `flag_path`
   tal cual viene de la DB, así que Uruguay salía roto.
2. **Duplicados 27/28 jun.** Cada fixture se ingirió dos veces y quedó **partido en dos filas**:
   una con `provider_match_id` (sync de football-data.org — recibe resultados en vivo) y
   `match_number = null`; la otra con `match_number` y `provider_match_id = null`. 11 pares en
   total, **confinados a esas dos fechas**. En todos, la fila con `provider_match_id` tenía **≥**
   predicciones que su gemela. La fila de Uruguay quedaba además enredada: el partido con más
   predicciones apuntaba al equipo `URU` roto.

**Decisiones (AskUserQuestion):**
- Empates de predicciones ⇒ **conservar la fila sincronizada** (`provider_match_id`) y backfillear
  su `match_number`. (El usuario aclaró que los duplicados son **del futuro / `SCHEDULED`**: quien
  pierda su predicción puede volver a predecir antes del kickoff, y lo prioritario es que el
  superviviente reciba el resultado en vivo.)
- Bandera ⇒ **consolidar a un solo equipo** Uruguay.
- Alcance ⇒ **solo reparación de datos**; **no** modificar el orquestador de sync.

## 2. Business Rules

| ID | Regla | Trazabilidad |
|---|---|---|
| **BR-60.1** | Existe a lo sumo una fila de equipo por país; la fila huérfana de Uruguay (`URU` / `/flags/uru.svg`) se consolida en la canónica (`URY` / `/flags/uy.svg`). | FR-REFINE-60.1 |
| **BR-60.2** | Antes de borrar la fila huérfana, **toda** referencia FK a ella se re-apunta a la canónica: `matches.home_team_id`, `matches.away_team_id`, `matches.winner_team_id`, `predictions.penalty_winner_team_id`. | FR-REFINE-60.1 |
| **BR-60.3** | En el rango `2026-06-27`–`2026-06-28`, cada fixture queda con **una sola** fila de partido. | FR-REFINE-60.2 |
| **BR-60.4** | Ante un par duplicado, sobrevive la fila con **más predicciones**; en **empate**, la fila con `provider_match_id` (recibe resultados en vivo). En los 11 pares la fila `provider_match_id` tiene ≥ predicciones, así que ambos criterios coinciden. | FR-REFINE-60.2, FR-REFINE-60.4 |
| **BR-60.5** | El superviviente **hereda del perdedor** los campos de identidad/visualización que tenga nulos: `match_number`, `home_placeholder`/`away_placeholder` (etiquetas del knockout, p. ej. "Runner-up Group A"), y `home_team_id`/`away_team_id` (defensivo). El `match_number` se backfillea **después** de borrar al perdedor, para liberar el slot de `@@unique([competitionId, matchNumber])`. | FR-REFINE-60.4 |
| **BR-60.6** | Las predicciones del partido eliminado (y sus `prediction_scores`) se borran vía `ON DELETE CASCADE` al eliminar la fila del partido; no se borran manualmente. | FR-REFINE-60.3 |
| **BR-60.7** | **Guarda de seguridad**: solo se actúa sobre el patrón exacto de corrupción —un grupo de 2 filas, una `provider_match_id`-only (`match_number = null`) y otra `match_number`-only (`provider_match_id = null`)—. Las filas sanas (ambos campos) y partidos legítimos del mismo horario quedan excluidos; cualquier forma inesperada se **omite y se reporta** (warning). | FR-REFINE-60.2 |

## 3. Business Logic Model

> Todo en un script idempotente de un solo uso (`scripts/repair-unit-60-duplicates-uruguay.ts`,
> tsx + Prisma), modo `--dry-run` por defecto y `--apply` para escribir, en **una transacción**
> contra `DIRECT_URL` (no-pooled). No es código de la app ni hay cambio de schema.

### BL-60.1: `consolidateUruguay(tx)` (BR-60.1, BR-60.2)

```
orphans   = teams where flag_path = '/flags/uru.svg' OR fifa_code = 'URU'
canonical = team where fifa_code = 'URY'
for orphan in orphans (≠ canonical):
  repoint matches.home_team_id / away_team_id / winner_team_id : orphan -> canonical
  repoint predictions.penalty_winner_team_id : orphan -> canonical
  delete orphan
```
Se ejecuta **primero**, de modo que el partido de Uruguay con más predicciones (que apuntaba a
`URU`) pase a apuntar a `URY` y su gemelo duplicado quede agrupable por equipos en BL-60.2.

### BL-60.2: `dedupeMatches(tx)` (BR-60.3…60.7)

```
matches = matches where kickoffAt in [2026-06-27, 2026-06-29)   # ambas fechas
groups  = group matches by groupKey (BL-60.3)
for group with size > 1:
  providerRows   = [m : providerMatchId != null AND matchNumber == null]
  numberOnlyRows = [m : providerMatchId == null AND matchNumber != null]
  guard (BR-60.7): require size==2 AND |providerRows|==1 AND |numberOnlyRows|==1, else skip+warn
  keeper = providerRows[0]; loser = numberOnlyRows[0]
  backfill = { campos de identidad nulos en keeper presentes en loser }   # BR-60.5
  delete loser            # cascade borra predicciones + scores (BR-60.6)
  if backfill no vacío: update keeper set backfill
```

### BL-60.3: `groupKey(match)` (clave de pareo)

```
base = competitionId | kickoffAt
if homeTeamId or awayTeamId present:   return base | homeTeamId | awayTeamId   # grupo: por equipos
else:                                  return base | "tbd" | phaseId           # knockout TBD: por fase
```
Los partidos de grupo se identifican por sus equipos resueltos. Las filas placeholder del knockout
tienen equipos nulos y sus gemelas **discrepan en el texto del placeholder** (una trae
"Runner-up Group A", la otra `null`), por lo que se agrupan por **fase + kickoff** (dentro de una
fase, un horario aloja un solo fixture).

## 4. Contratos / cambios

| Archivo | Cambio |
|---|---|
| `scripts/repair-unit-60-duplicates-uruguay.ts` | **NEW.** Script de reparación idempotente (BL-60.1…60.3); `--dry-run`/`--apply`; una transacción. |

### Sin cambios
- Schema (`prisma/schema.prisma`), migraciones: **ninguna** (reparación de datos, no de estructura).
- Código de la app: ninguno. El fix de Uruguay (`a2cfb96`) y el cascade ya estaban en `main`.
- Orquestador de sync (`sync-orchestrator.ts`): **no se toca** (decisión del usuario). Ver "Fuera de alcance".

### Fuera de alcance
- **Endurecer el dedupe del sync** para que un re-sync futuro no pueda recrear los duplicados
  (la causa estructural). Descartado explícitamente por el usuario para este refine.
- Fusionar predicciones del perdedor en el superviviente (el usuario pidió **eliminarlas**; además
  `@@unique([userId, matchId])` impediría una fusión si un usuario predijo en ambos duplicados).

## 5. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| Integridad referencial | **COMPLIANT** | Las FKs se re-apuntan antes de borrar el equipo huérfano; las predicciones/scores caen por `ON DELETE CASCADE`. Todo en una transacción. |
| Pérdida de datos | **COMPLIANT (aceptada)** | Se borran ~15 predicciones de los duplicados perdedores; son partidos **futuros/`SCHEDULED`** (re-predecibles) y es lo que el usuario pidió explícitamente. Mitigado con `--dry-run` previo y guarda de patrón. |
| SECURITY (input surface) | **COMPLIANT** | Sin nueva superficie de entrada; sin schema, migraciones, rutas, server actions ni i18n. Script puntual de operador. |

## 6. Verificación

- **Dry-run**: `npx tsx scripts/repair-unit-60-duplicates-uruguay.ts` → 10 pares + consolidación de
  Uruguay (el par de Uruguay solo se agrupa bajo `--apply`, tras el re-apuntado en la misma
  transacción → 11 pares).
- **Apply**: `npx tsx scripts/repair-unit-60-duplicates-uruguay.ts --apply` → "11 duplicate pair(s)
  removed, 15 linked prediction(s) deleted".
- **Queries de control (read-only)**:
  - `teams WHERE name ILIKE '%uruguay%'` → **1 fila**, `URY` / `/flags/uy.svg`.
  - duplicados (group by kickoff+fixture) en 27/28 jun → **0**; cada superviviente con
    `provider_match_id` **y** `match_number` no nulos.
  - `COUNT(*) FROM matches` → **135** (146 − 11).
- **App**: cargar `/matches` → Uruguay con bandera; cada partido del 27/28 jun una sola vez con su
  etiqueta "Partido N".
- **Pendiente (manual)**: revalidar la caché de `/matches`/`/pools` (Next 16, fuera del flujo de
  mutaciones) vía acción admin de sync/recalc, o esperar TTL.
