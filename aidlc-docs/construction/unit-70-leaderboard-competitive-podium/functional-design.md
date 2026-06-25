# Functional Design — Unit 70: Leaderboard competitivo (podio + serpentinas)

> Refine post-construcción (2026-06-25). Refine **puramente presentacional** sobre el componente compartido **`PoolLeaderboard`** (Unit 6 / 55 / 62). **No reinicia** etapas aprobadas (Units 1–69 intactas). Un solo cambio de componente cubre las tres superficies (`/rankings`, `/pools/[id]` tab Clasificación, `/pools/[id]/leaderboard`) y **ambos modos** (confirmado y la proyección en vivo de Unit 62), porque todas consumen el mismo componente.

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-70.1 | requirements | El leaderboard "hace referencia a una competencia": top-5 estilizadas distintas entre sí |
| FR-REFINE-70.2 | requirements | Emoji de posición (🥇🥈🥉) en las 3 primeras posiciones |
| FR-REFINE-70.3 | requirements | Resaltado creativo de las posiciones destacadas (degradados oro/plata/bronce) |
| FR-REFINE-70.4 | requirements | Animación de serpentinas en la 1.ª posición |
| FR-REFINE-70.5 | requirements | Aplica al leaderboard global **y** al de un pool |

## 1. Contexto y decisión

El leaderboard se renderiza con un **único componente compartido** `PoolLeaderboard`
(`src/features/scoring-rankings/components/pool-leaderboard.tsx`), montado por:

- `/rankings` (global) — `getGlobalRankingProjection`.
- `/pools/[id]` tab Clasificación — `getPoolLeaderboard` + `projectPoolLeaderboardFromLoaded`, con `limit={20}`.
- `/pools/[id]/leaderboard` — `getPoolLeaderboardProjection`.

Por tanto **un solo cambio de componente** satisface FR-REFINE-70.5 (global + pool) y aplica
tanto al modo **confirmado** como al modo **proyección en vivo** de Unit 62.

**Decisiones aprobadas (AskUserQuestion, plan presentado y aprobado antes de ejecutar):**

1. **Serpentinas = bucle sutil continuo** sobre la 1.ª posición (no one-shot, no condicionado a que el viewer sea #1).
2. **Implementación = CSS puro**, sin dependencia nueva (alineado con Tailwind v4 CSS-first; descartada `canvas-confetti`).
3. **Numeración**: el `/aidlc:build` previo construyó un Unit 69 **no relacionado** (alias de TLA de Uruguay). Para no colisionar ni perder ese trabajo, este refine se renumeró a **Unit 70** y el Unit 69 de Uruguay se conserva intacto.

## 2. Business Rules

### BR-70.1 — El estilado se llavea por la **posición mostrada**
La decoración del podio depende de la **posición que ve el usuario**: en modo confirmado es
`LeaderboardRow.position`; durante la proyección de Unit 62 es `ProjectedLeaderboardRow.projectedPosition`.
Así el podio (medallas, degradados, serpentinas) **se reordena en vivo** junto con la proyección:
si la proyección eleva a un usuario a la 1.ª posición, las serpentinas y el 🥇 lo siguen.

### BR-70.2 — Top-5 distintas entre sí
| Posición mostrada | Emoji | Resaltado |
|-------------------|-------|-----------|
| **1** | 🥇 | Degradado dorado (`from-amber-200/70 … ring-amber-400/50`), avatar con `ring-2 ring-amber-400/70`, fila más alta (`py-4`), **serpentinas CSS** superpuestas |
| **2** | 🥈 | Degradado plata (`from-zinc-300/60 …`) |
| **3** | 🥉 | Degradado bronce (`from-orange-300/50 …`) |
| **4**, **5** | — (número) | Chip de número `rounded-full bg-foreground/5` + fila `bg-muted/40` |
| **6+** | — (número) | Estilo original (sin cambios) |

Cada degradado tiene su variante dark (`dark:from-…`). La lógica vive en `podiumFor(position)`.

### BR-70.3 — Accesibilidad
- Los emojis de medalla son **decorativos** → `aria-hidden="true"`. El **número de rango** se conserva
  siempre en el DOM (en `leaderboard-position-{userId}`) para lectores de pantalla, de modo que no se
  pierde información semántica. **No se añaden keys i18n** (el número ya transmite la posición).
- Las serpentinas se deshabilitan bajo `@media (prefers-reduced-motion: reduce)` (regla en `globals.css`).
- El overlay de serpentinas es `pointer-events-none` y `aria-hidden`.

### BR-70.4 — Serpentinas: CSS puro, Server Component
`LeaderboardConfetti` (`leaderboard-confetti.tsx`) es un **Server Component sin `"use client"`**:
renderiza un conjunto **determinista** de piezas (`<span>`) posicionadas por porcentaje, con
`animation-duration`/`animation-delay` variados vía estilo inline. La animación
`@keyframes leaderboard-streamer-fall` (caída + giro continuo, `infinite`) y los estilos base de
`.leaderboard-confetti__piece` viven en `globals.css`. Cero JS de cliente, SSR estable, sin hidratación.
El overlay es `absolute inset-0 z-0` dentro de la fila campeona (`relative overflow-hidden`); el contenido
de la fila lleva `relative z-10` para pintar por encima.

### BR-70.5 — Preservación de contratos existentes
Se mantienen **intactos**: todos los `data-testid` (`pool-leaderboard`, `leaderboard-row-{id}`,
`leaderboard-position-{id}`, `leaderboard-projected-{id}`, `leaderboard-delta-{id}`), el atributo
`data-projection`, el `title={copy.disclaimer}` en modo proyección, el resaltado del viewer
(`border-l-primary`, y `bg-muted/50` solo cuando el viewer no está en el podio), el `limit`, y toda la
semántica de Unit 62 (flecha `→`, badge, delta `sube/baja/igual/nuevo`). Nada se persiste; ninguna query,
server action, schema, migración, ruta ni i18n cambia.

## 3. Refactor

El componente tenía **dos ramas de render duplicadas** (confirmado vs proyección). Se **unificó** en un
único `<ol>` con un solo `.map`, extrayendo:
- `podiumFor(position)` — mapea posición → `{ medal, rowClass, champion, topFive }`.
- `ProjectionPoints` — subcomponente para la celda derecha del modo proyección.

La rama solo difiere en la celda derecha (`ProjectionPoints` vs `<total> pts`). El podio aplica idéntico
en ambos modos.

## 4. Archivos

| Archivo | Cambio |
|---------|--------|
| `src/features/scoring-rankings/components/pool-leaderboard.tsx` | MODIFIED — unificación + `podiumFor` + podio + overlay en la 1.ª |
| `src/features/scoring-rankings/components/leaderboard-confetti.tsx` | NEW — Server Component CSS puro de serpentinas |
| `src/app/globals.css` | MODIFIED — `@keyframes leaderboard-streamer-fall` + `.leaderboard-confetti__piece` + guard `prefers-reduced-motion` |
| `src/features/scoring-rankings/components/__tests__/pool-leaderboard.test.tsx` | MODIFIED — +4 tests (medallas top-3, serpentinas solo en la 1.ª, podio sigue `projectedPosition`) |

## 5. Stages

Requirements/User Stories EXECUTE (FR-REFINE-70.1…70.5). Functional Design EXECUTE (este doc).
Code Generation EXECUTE. Build and Test EXECUTE. **SKIP** Reverse Engineering, Units Generation,
NFR Requirements/Design, Infrastructure, Application Design (refine presentacional, sin nuevo unit-of-work,
sin schema/migraciones/rutas/server actions).

## 6. Verificación

- `pnpm vitest run src/features/scoring-rankings` → **55/55** (pool-leaderboard component **10/10**, +4 nuevos).
- `tsc --noEmit` → 0 errores en archivos tocados (persisten 2 preexistentes de `pool-live-now-banner.test.tsx` Unit 61, no relacionados).
- Biome → limpio.

## 7. Out of scope

- aria-labels i18n de podio ("1.er lugar"/"1st place") — el número de rango ya da el dato a lectores de pantalla.
- Librería de confeti (`canvas-confetti`) — descartada por añadir dependencia y JS de cliente.
- Animar el **reordenamiento** de filas cuando la proyección cambia el orden (transición FLIP) — fuera de alcance.
