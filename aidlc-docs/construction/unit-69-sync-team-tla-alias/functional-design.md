# Functional Design — Unit 69: alias de TLA del proveedor → fifaCode canónico (bandera de Uruguay no recurrente)

> Refine post-construcción (2026-06-25) vía `/aidlc:refine`. **Fix de código** (causa estructural),
> a diferencia de Unit 60 que fue **reparación de datos**. Refine sobre **Unit 25/28** (sync desde
> football-data.org) y la entidad `teams` de **Unit 4** (Competition Data). **Plan presentado y
> aprobado antes de ejecutar** (decisiones vía AskUserQuestion: enfoque = **alias map de TLA**;
> datos = **re-correr el script de reparación de Unit 60**). **No reinicia** etapas aprobadas
> (Units 1–68).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-69.1 | requirements | La bandera de Uruguay se ve en `/matches` y `/pools` **y se mantiene tras cada sync** desde football-data.org: el equipo se resuelve a la fila canónica (`URY`, `/flags/uy.svg`), sin recrear la huérfana `URU`. |
| US-69.1 | stories | Como usuario, quiero ver la bandera de Uruguay correctamente **siempre**, sin que se rompa cada vez que el admin sincroniza los partidos. |
| BR-4.x | unit-4 | `teams` se resuelve por `fifaCode`; FKs desde `matches`/`predictions`. |
| BR-25.x / BR-28.x | unit-25/28 | El sync normaliza la respuesta de football-data.org y upserta `teams` por `fifaCode` (`upsertTeam`), resolviendo los equipos de cada partido por `fifaCode` en `sync-orchestrator`. |
| BR-39.x | unit-39 | `Team.providerTeamId` **no** es `@unique` ni llave de búsqueda; todo lookup de equipo usa `fifaCode`. |
| BR-60.x | unit-60 | Reparación de datos previa (consolidó `URU`→`URY` y dedup de partidos del 27/28 jun). **Dejó la causa estructural fuera de alcance** — de ahí la recurrencia. |

## 1. Intención del usuario

> *"Hay matches que aún no es visible la bandera de Uruguay, está con un enlace roto."*

**Diagnóstico (causa raíz), confirmado por inspección del código del proveedor y los assets:**

Todo el pipeline de equipos se llavea por `fifaCode`, que tomamos del `tla` (trigrama) que envía
football-data.org. Para Uruguay el proveedor devuelve **`tla = "URU"`**, pero nuestro código
canónico es **`URY`** (alineado en `a2cfb96`; el asset de bandera es `public/flags/uy.svg`, no existe
`uru.svg`). En consecuencia, en `src/features/competition/services/providers/football-data.ts`:

1. **Enriquecimiento falla.** `canonicalTeamByFifaCode.get("URU")` → *miss* (el mapa está llaveado por
   el canónico `URY`). El fallback fabrica `flagPath = "/flags/uru.svg"` —**asset inexistente** → imagen
   rota—, `name` del proveedor y `isoAlpha2 = null`.
2. **Se recrea la huérfana.** `upsertTeam({ fifaCode: "URU" })` no encuentra fila por `fifaCode` y hace
   `create`, **recreando exactamente la fila `URU` que Unit 60 eliminó**.
3. **Los partidos se enredan.** `sync-orchestrator` resuelve `homeFifaCode/awayFifaCode` (= `"URU"`) con
   `findUnique({ where: { fifaCode } })` → encuentra la `URU` recién creada y enlaza los partidos de
   Uruguay a ella. `team-badge.tsx` pinta `flagPath` tal cual → bandera rota.

Este es el **bucle de recurrencia**: cada sync en vivo vuelve a romper Uruguay (y reintroduce el
enredo de equipo/partidos duplicados que Unit 60 limpió). Unit 60 reparó el **dato**, pero
**descartó explícitamente** endurecer el sync, por lo que la causa sobrevivió.

**Decisiones (AskUserQuestion):**
- Enfoque ⇒ **alias map de TLA → fifaCode canónico** en el límite de normalización del proveedor
  (`URU → URY`). Mantiene `URY` como código canónico (el badge sigue mostrando `URY`). Mínimo,
  quirúrgico y extensible a futuros desajustes. (Descartado: volver el canónico a `URU` + añadir
  `uru.svg`; resolver por `providerTeamId` —requeriría backfillear los 758/etc. en los 48 equipos.)
- Datos ⇒ **re-correr el script idempotente de Unit 60** para consolidar la huérfana `URU` recreada
  desde Unit 60 y re-apuntar sus partidos; el fix de código previene la recurrencia futura pero no
  limpia las filas ya sincronizadas.

## 2. Business Rules

| ID | Regla | Trazabilidad |
|---|---|---|
| **BR-69.1** | El proveedor define un mapa `TLA_ALIAS` (TLA del proveedor → `fifaCode` canónico). Hoy: `{ URU: "URY" }`. Es la **única fuente de verdad** del desajuste y se aplica en el límite de normalización, antes de cualquier consumidor downstream. | FR-REFINE-69.1 |
| **BR-69.2** | La normalización resuelve el código canónico de cada equipo con `canonicalFifaCode(tla) = (tla.length === 3) ? (TLA_ALIAS[tla] ?? tla) : null`. Un `tla` no aliaseado pasa intacto; un `tla` ausente/inválido → `null` (igual que antes). | FR-REFINE-69.1 |
| **BR-69.3** | El código canónico se usa de forma consistente en **(a)** la llave del `teamsMap`, **(b)** el `fifaCode` del equipo normalizado (que alimenta `upsertTeam` y el enriquecimiento `canonicalTeamByFifaCode.get`), y **(c)** `homeFifaCode`/`awayFifaCode` de cada partido (que `sync-orchestrator` usa para resolver `homeTeamId`/`awayTeamId`). | FR-REFINE-69.1 |
| **BR-69.4** | Con el alias activo, el equipo de Uruguay del proveedor enriquece contra la fila canónica `URY` (`name "Uruguay"`, `isoAlpha2`, `flagPath "/flags/uy.svg"`) y `upsertTeam` **actualiza** la fila `URY` en lugar de crear `URU`. No vuelve a aparecer ninguna fila `URU` ni `flagPath` apuntando a un asset inexistente. | FR-REFINE-69.1 |
| **BR-69.5** | Cambio confinado al adaptador del proveedor. Sin schema, migraciones, rutas, server actions ni i18n. El badge sigue mostrando el código canónico `URY`. | FR-REFINE-69.1 |

## 3. Business Logic Model

### BL-69.1: `canonicalFifaCode(tla)` (BR-69.1, BR-69.2)

```
TLA_ALIAS = { URU: URY }                # única fuente de verdad del desajuste
canonicalFifaCode(tla):
  if tla is null or tla.length != 3:  return null
  return TLA_ALIAS[tla] ?? tla
```

### BL-69.2: aplicación en la normalización (BR-69.3, BR-69.4)

```
# matches
homeFifaCode = canonicalFifaCode(match.homeTeam.tla)
awayFifaCode = canonicalFifaCode(match.awayTeam.tla)

# teams (dedup por código canónico)
for match in matches:
  homeCode = canonicalFifaCode(match.homeTeam.tla); if homeCode: teamsMap[homeCode] = {fifaCode: homeCode, name, providerTeamId}
  awayCode = canonicalFifaCode(match.awayTeam.tla); if awayCode: teamsMap[awayCode] = {fifaCode: awayCode, name, providerTeamId}

# enrichment (sin cambios: ahora canonicalTeamByFifaCode.get(URY) acierta)
team.fifaCode (= canónico) -> canonicalTeamByFifaCode.get -> {name, isoAlpha2, flagKey, flagPath}
```

## 4. Contratos / cambios

| Archivo | Cambio |
|---|---|
| `src/features/competition/services/providers/football-data.ts` | **MODIFIED.** Nuevo `TLA_ALIAS` + helper `canonicalFifaCode(tla)` (BL-69.1); aplicado a `homeFifaCode`/`awayFifaCode` y a la extracción de `teams` (BL-69.2). |
| `src/features/competition/services/providers/__tests__/football-data.test.ts` | **MODIFIED.** +1 caso: un partido con `tla: "URU"` (id 758) se normaliza a `fifaCode "URY"`, `flagPath "/flags/uy.svg"`, sin fila `URU`, y `homeFifaCode = "URY"`. |
| `scripts/repair-unit-60-duplicates-uruguay.ts` | **REUSO (sin cambios).** Re-corrida operativa (dry-run → `--apply`) para consolidar la huérfana `URU` recreada y deduplicar partidos. |

### Sin cambios
- Schema (`prisma/schema.prisma`), migraciones: **ninguna**.
- `sync-orchestrator.ts`, `upsert-competition-data.ts`: **sin tocar** — el alias upstream hace que sus
  lookups por `fifaCode` resuelvan la fila canónica sin cambiar su lógica.
- `team-badge.tsx`, i18n, rutas, server actions: ninguno.

### Fuera de alcance
- Backfillear `providerTeamId` en los equipos canónicos del seed para resolver por ID en vez de TLA
  (alternativa más amplia, descartada por el usuario en favor del alias).
- Auditar exhaustivamente todos los `tla` del proveedor contra los 48 assets; el alias se siembra con
  el único caso vivo conocido (`URU`) y queda extensible.
- Endurecer la deduplicación de **partidos** del sync (cubierto por la corrida de reparación; la
  causa de duplicados de partido es ortogonal al alias de equipo).

## 5. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| SECURITY (input surface) | **COMPLIANT** | Sin nueva superficie de entrada; sin schema, migraciones, rutas, server actions ni i18n. Transformación pura sobre datos del proveedor ya confiados por el sync. |
| Integridad referencial | **COMPLIANT** | El alias hace que `upsertTeam` actualice la fila canónica `URY` en vez de crear `URU`; los partidos resuelven a la fila canónica. La corrida de reparación re-apunta FKs en una transacción antes de borrar la huérfana. |
| Determinismo de scoring | **COMPLIANT** | No toca el motor de puntuación; solo corrige la identidad/visualización del equipo. |

## 6. Verificación

- **Unit test**: `vitest run football-data.test.ts` → **8/8** (incl. el nuevo caso URU→URY).
- **Suite de competición**: `vitest run src/features/competition` → **58/58**, sin regresiones.
- **Tipos/estilo**: `tsc --noEmit` sin errores en archivos tocados; Biome limpio (2 archivos).
- **App (manual, tras sync)**: cargar `/matches` y `/pools` → Uruguay con bandera `uy.svg`; tras un
  sync FIXTURES/FULL del admin, **no** reaparece la fila `URU` ni el enlace roto.
- **Reparación de datos (ejecutada, 2026-06-25)**: en la DB remota (Supabase, `DIRECT_URL`):
  1. `npx tsx scripts/repair-unit-60-duplicates-uruguay.ts` (dry-run) → detectó 1 huérfana `URU`
     (`bb2c95c4…`, `/flags/uru.svg`) a consolidar en `URY` (`58b14114…`), re-apuntando 1 ref de
     partido (`home`), 0 pares de partidos duplicados, 0 predicciones a borrar.
  2. `npx tsx scripts/repair-unit-60-duplicates-uruguay.ts --apply` → "0 duplicate pair(s) removed,
     0 linked prediction(s) deleted"; huérfana `URU` consolidada y borrada en una transacción.
  3. **Verificado en la DB**: `teams` con `name ILIKE '%uruguay%'` → **1 fila** (`URY` / `/flags/uy.svg`
     / `providerTeamId 758`); huérfanas `URU` / `/flags/uru.svg` restantes → **0**.
- **Pendiente (operativo)**: revalidar la caché de `/matches`/`/pools` (Next 16, fuera del flujo de
  mutación) vía acción admin de sync/recalc, o esperar TTL, para que la vista refleje la bandera.
