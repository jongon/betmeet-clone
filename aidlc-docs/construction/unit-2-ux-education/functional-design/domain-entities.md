# Unit 2: UX Education and Onboarding — Domain Entities

> **Nota de naturaleza**: Este unit es predominantemente de **contenido y presentación**. La mayoría de sus "entidades" no son tablas persistidas en base de datos, sino documentos de contenido (MDX), objetos de configuración en código, y estado efímero en el navegador (localStorage). No se introducen tablas nuevas en PostgreSQL. Se describen aquí como conceptos de dominio técnico-agnósticos para guiar el code generation.

---

## 1. RuleDocument

Representa una sección del contenido educativo de reglas. Materializada como archivos MDX en el repositorio (decisión Q3).

| Atributo | Tipo | Descripción |
|---|---|---|
| `slug` | string | Identificador estable de la sección (ej. `scoring`, `penalties`, `match-locks`, `ties`, `pools`). |
| `title` | string (i18n key) | Título mostrado de la sección. |
| `order` | integer | Orden de aparición en el Rules Center. |
| `audience` | enum (`teaser`, `full`) | `teaser`: resumen mostrado en landing pública. `full`: contenido completo (solo autenticado). |
| `body` | MDX | Cuerpo del contenido, renderizado en build. |

**Relaciones**: Ninguna persistida. Conjunto fijo de documentos versionados en el repo.

**Secciones requeridas** (del screen contract Rules Center):
- `scoring` — Reglas y ejemplos de puntuación.
- `penalties` — Predicción de penales en knockout.
- `match-locks` — Deadline de bloqueo de predicción.
- `ties` — Comportamiento de empates en el ranking (sin desempate).
- `pools` — Límite de miembros (hasta 100) y regla de expulsión.

---

## 2. ScoringRuleSet

Conjunto de constantes canónicas de puntuación. Es la **fuente de verdad compartida** para la calculadora educativa (este unit) y para el scoring autoritativo de Unit 6. Debe vivir en un módulo único reutilizable para evitar divergencia.

| Atributo | Tipo | Valor | Origen |
|---|---|---|---|
| `EXACT_SCORE` | integer | 5 | US-5.1 |
| `CORRECT_RESULT` | integer | 2 | US-5.1 |
| `PARTIAL_GOAL_COUNT` | integer | 1 por equipo acertado | US-5.1 / FR-REFINE-36 |
| `MISS` | integer | 0 | US-5.1 |
| `PENALTY_BONUS` | integer | +1 | US-5.1 |

**Invariante**: Unit 2 (educación) y Unit 6 (scoring real) deben importar el **mismo** módulo de constantes. La calculadora educativa es una *vista previa* cliente; nunca define reglas propias.

---

## 3. ScoringExample (Valor)

Objeto de valor usado por la calculadora interactiva y el `ScoreBreakdownExplainer`. No persistido.

| Atributo | Tipo | Descripción |
|---|---|---|
| `predictedHome` | integer ≥ 0 | Goles predichos local. |
| `predictedAway` | integer ≥ 0 | Goles predichos visitante. |
| `actualHome` | integer ≥ 0 | Goles reales local. |
| `actualAway` | integer ≥ 0 | Goles reales visitante. |
| `isKnockout` | boolean | Si la fase es eliminatoria (habilita penales). |
| `predictedPenaltyWinner` | enum (`home`, `away`, `null`) | Ganador de penales predicho (solo si knockout y empate). |
| `actualPenaltyWinner` | enum (`home`, `away`, `null`) | Ganador real de penales. |
| `computedPoints` | integer (derivado) | Resultado de aplicar `ScoringRuleSet`. |
| `breakdown` | ScoreBreakdown (derivado) | Desglose explicativo (ver entidad 4). |

---

## 4. ScoreBreakdown (Valor, derivado)

Resultado estructurado de evaluar un `ScoringExample`. Lo produce la lógica de scoring y lo consume el `ScoreBreakdownExplainer` (reutilizable por Unit 6, decisión Q9).

| Atributo | Tipo | Descripción |
|---|---|---|
| `matchedCase` | enum (`EXACT`, `RESULT`, `PARTIAL`, `MISS`) | Clasificación resumida del puntaje base; desde FR-REFINE-36 puede representar una suma de componentes no exactos. |
| `basePoints` | integer | Puntos base: exacto 5 o, si no exacto, suma de resultado correcto + goles acertados. |
| `penaltyApplied` | boolean | Si se otorgó el bonus de penales. |
| `penaltyPoints` | integer | 0 ó +1. |
| `totalPoints` | integer | `basePoints + penaltyPoints`. |
| `explanationKey` | string (i18n) | Clave de copy que explica por qué se otorgó ese puntaje. |

---

## 5. EducationCue (Configuración + estado efímero)

Pista educativa contextual. Definición estática en código; estado de descarte en `localStorage` (decisión Q6=C, Q7=A).

| Atributo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador estable (ej. `nickname-discriminator`, `scoring-hint`, `match-lock-countdown`). |
| `kind` | enum (`dismissible-callout`, `info-popover`) | `dismissible-callout`: educación first-run, descartable. `info-popover`: referencia persistente vía icono info. |
| `context` | string | Dónde se muestra (ruta o componente ancla). |
| `copyKey` | string (i18n) | Clave de la copy del cue. |

**Estado de descarte** (solo para `dismissible-callout`):
- Clave en localStorage: `cue:dismissed:{id}` → `"1"`.
- Semántica: una vez descartado, no vuelve a mostrarse en ese navegador. No se sincroniza entre dispositivos (Q7=A).
- Los `info-popover` no tienen estado de descarte.

---

## 6. OnboardingStep (extensión de Unit 1)

Unit 1 definió los pasos `nickname → avatar → passkey`. Unit 2 inserta el paso `rules` antes de `passkey` (decisión Q2=A).

| Atributo | Tipo | Descripción |
|---|---|---|
| `key` | enum (`nickname`, `avatar`, `rules`, `passkey`) | Identificador del paso. Se añade `rules`. |
| `label` | string (i18n) | Etiqueta en el indicador de progreso. |
| `required` | boolean | `nickname` es duro (Unit 1). `rules` es **saltable** (Q8=B). `avatar` y `passkey` ya eran saltables. |

**Orden final**: `nickname` (1) → `avatar` (2) → `rules` (3) → `passkey` (4).

---

## 7. PoolPreviewItem (interfaz hacia Unit 3)

Contrato de datos que la landing consume para la sección de pools públicos. Definido aquí como **interfaz**; Unit 3 lo implementa (decisión Q1=B). Hasta entonces, la landing renderiza estado skeleton/vacío.

| Atributo | Tipo | Descripción |
|---|---|---|
| `id` | string | Id del pool. |
| `name` | string | Nombre público. |
| `memberCount` | integer | Miembros actuales. |
| `capacity` | integer | Capacidad (≤ 100). |

**Estado de carga**: La landing maneja `loading` (skeleton), `empty` (sin pools / fuente no disponible), `error` (oculta la sección, mantiene la explicación estática). El componente existe y está cableado; la fuente de datos llega en Unit 3.

---

## Resumen de persistencia

| Entidad | Dónde vive | Persistencia |
|---|---|---|
| RuleDocument | Archivos MDX en repo | Versionado en git (no DB) |
| ScoringRuleSet | Módulo de constantes en repo | Código (no DB) |
| ScoringExample / ScoreBreakdown | En memoria (runtime) | Efímero |
| EducationCue (definición) | Código | Código (no DB) |
| EducationCue (descarte) | Navegador | localStorage |
| OnboardingStep | Código (config de pasos) | Código (no DB) |
| PoolPreviewItem | Interfaz; datos en Unit 3 | N/A en Unit 2 |

**No se crean migraciones de base de datos en Unit 2.**
