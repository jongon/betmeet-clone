# Unit 2: UX Education and Onboarding — Frontend Components

> Jerarquía de componentes, props, estado, interacciones y puntos de integración. Construido sobre los patrones de Unit 1 (App Router, Server/Client Components, shadcn/ui, Tailwind v4).

---

## Mapa de rutas

| Ruta | Acceso | Componente raíz | Estado |
|---|---|---|---|
| `/` | Público | `LandingPage` | Reemplaza el placeholder actual del template |
| `/rules` | Autenticado (gated) | `RulesCenterPage` | Nuevo |
| `/onboarding/profile` | Autenticado (onboarding) | `OnboardingClient` (extendido) | Modificado: +paso `rules` |

> `/rules` se elimina de las rutas públicas en `proxy.ts` durante code generation (BR-2.10).

---

## 1. LandingPage (`/`)

**Tipo**: Server Component (estático mayormente) con islas cliente.

**Estructura**:
```
LandingPage
├── LandingHero            (propuesta de valor + CTA "Entra a Jugar"; actualizado por Unit 18)
├── ScoringTeaser          (tarjeta resumen: exacto 5 / resultado 2 / parcial 1 / penales +1)
├── PoolPreview            (cliente; cableado a PoolPreviewItem[], skeleton/empty/error)
└── LandingSecondaryCTAs   ("Iniciar sesión", "Explorar pools públicos")
```

### LandingHero
| Prop | Tipo | Descripción |
|---|---|---|
| — | — | Sin props; copy vía diccionario i18n |

Interacción: CTA principal navega al flujo de registro (`/sign-up`).

### ScoringTeaser
| Prop | Tipo | Descripción |
|---|---|---|
| — | — | Renderiza las 5 reglas de puntuación desde el contenido `audience=teaser` |

Es el único contenido de reglas público (BR-2.9). Estático, sin interacción.

### PoolPreview
| Prop | Tipo | Descripción |
|---|---|---|
| `pools` | `PoolPreviewItem[] \| null` | Datos de pools (null hasta Unit 3) |
| `state` | `"loading" \| "empty" \| "error" \| "ready"` | Estado de carga |

- `loading` → skeleton rows.
- `empty` / `null` → mensaje "Pools públicos próximamente" o sección vacía cableada.
- `error` → oculta la sección (BR-2.26).
- Integración futura: Unit 3 conecta la fuente real de `PoolPreviewItem`.

---

## 2. RulesCenterPage (`/rules`)

**Tipo**: Server Component (contenido MDX) + islas cliente (calculadora).

**Estructura**:
```
RulesCenterPage  (gated: requiere sesión)
├── RulesHeader            (CTA autenticado: "Hacer predicciones")
├── RulesAccordion         (secciones MDX: scoring, penalties, match-locks, ties, pools)
│   └── RuleSection[]       (una por RuleDocument audience=full)
├── ScoringCalculator      (cliente, interactivo)
│   └── ScoreBreakdownExplainer  (muestra el desglose del cálculo actual)
└── ScoreBreakdownDemo     (demo con datos de ejemplo — Q9=C)
```

### RulesAccordion / RuleSection
| Prop | Tipo | Descripción |
|---|---|---|
| `sections` | `RuleDocument[]` | Secciones completas ordenadas por `order` |

- Mobile: acordeones colapsables (mobile note del contrato).
- La tarjeta de puntuación se mantiene visible/repetida cerca de los ejemplos.

### ScoringCalculator (cliente)
| Prop | Tipo | Descripción |
|---|---|---|
| `initialExample` | `ScoringExample` | Valores de ejemplo iniciales |

**Estado interno**:
| Estado | Tipo | Descripción |
|---|---|---|
| `predictedHome/Away` | number | Inputs de predicción |
| `actualHome/Away` | number | Inputs de resultado |
| `isKnockout` | boolean | Toggle de fase eliminatoria |
| `predictedPenaltyWinner` | `"home"\|"away"\|null` | Solo visible si knockout y empate |
| `breakdown` | `ScoreBreakdown` | Derivado en vivo vía `computeScore` |

**Interacciones**:
- Al cambiar cualquier input, recalcula `breakdown` con `computeScore` (BL-1) y lo pasa al `ScoreBreakdownExplainer`.
- El selector de ganador de penales solo aparece cuando `isKnockout && actualHome === actualAway` (mitiga UX risk del contrato de predicción).

**Validación de inputs**:
| Regla | Comportamiento |
|---|---|
| Goles ≥ 0 | Inputs no aceptan negativos; clamp a 0 |
| Goles enteros | Solo enteros |
| Penalty winner | Requerido solo si knockout + empate; oculto/ignorado en otro caso |

### ScoreBreakdownExplainer (reutilizable — entregable clave para Unit 6)
| Prop | Tipo | Descripción |
|---|---|---|
| `example` | `ScoringExample` | Predicción + resultado |
| `breakdown` | `ScoreBreakdown` | Desglose ya calculado |

- **Data-agnóstico**: dado un example + breakdown, renderiza la explicación (caso base, puntos, bonus penales, total) usando `explanationKey`.
- No realiza fetching ni asume contexto de pool; Unit 6 lo conecta a predicciones reales (BR-2.33).
- Reusado en: `ScoringCalculator` (vivo) y `ScoreBreakdownDemo` (ejemplos).

---

## 3. OnboardingClient (extensión de Unit 1)

**Cambio**: insertar el paso `rules` entre `avatar` y `passkey`.

**Estructura modificada**:
```
OnboardingClient
├── OnboardingProgressIndicator   (4 pasos: nickname, avatar, rules, passkey)
├── NicknameStep   (Unit 1, sin cambios)
├── AvatarStep     (Unit 1, sin cambios)
├── RulesStep      (NUEVO)
└── PasskeyStep    (Unit 1, sin cambios)
```

### RulesStep (nuevo)
| Prop | Tipo | Descripción |
|---|---|---|
| `onComplete` | `() => void` | Avanza al paso passkey |
| `onSkip` | `() => void` | Avanza al paso passkey (saltable) |

**Contenido**: resumen de puntuación + enlace al Rules Center completo.

**Interacciones**:
- `Continuar` → `onComplete()`.
- `Saltar por ahora` → `onSkip()`.
- Ambas avanzan; el paso nunca bloquea (BR-2.21).

### OnboardingProgressIndicator (modificado)
- Se añade `{ label: "Reglas", key: "rules" }` al array `STEPS` entre `avatar` y `passkey`.
- El tipo `Step` en `OnboardingClient` pasa a `"nickname" | "avatar" | "rules" | "passkey"`.

---

## 4. Componentes de cues educativos (transversales)

### DismissibleCallout
| Prop | Tipo | Descripción |
|---|---|---|
| `cueId` | string | Identificador del cue (clave localStorage) |
| `children` | ReactNode | Contenido del callout |

**Estado**: `dismissed` (derivado de localStorage vía `shouldShowCallout`).
**Interacción**: botón de cierre → `dismissCallout(cueId)` → oculta permanentemente en ese navegador (BR-2.15, BR-2.16).
**Robustez**: si localStorage no está disponible, se muestra (BR-2.18).

### InfoPopover
| Prop | Tipo | Descripción |
|---|---|---|
| `copyKey` | string | Clave i18n del contenido |

- Icono de información con popover/tooltip (base-ui).
- Sin estado de descarte (BR-2.17). Siempre disponible.

**Cues entregados como contrato para Units 5/6**: `scoring-hint` y `match-lock-countdown` se exportan como componentes listos; sus pantallas ancla llegan después.

---

## 5. Infraestructura de i18n

```
src/i18n/
├── dictionaries/
│   └── es.ts          (diccionario español — único activo)
├── get-dictionary.ts  (carga el diccionario por locale)
└── types.ts           (tipos de claves para type-safety)
```

- Todo texto de cara al usuario referencia claves del diccionario (BR-2.28).
- Estructura preparada para añadir `en.ts` u otros sin tocar componentes (BR-2.29).
- Contenido MDX de reglas organizado por locale.

---

## Puntos de integración

| Componente | Depende de | Provisto por |
|---|---|---|
| `PoolPreview` | `PoolPreviewItem[]` | Unit 3 (interfaz definida aquí) |
| `ScoreBreakdownExplainer` | predicciones reales | Unit 6 (componente entregado aquí) |
| `ScoringCalculator` / `computeScore` | `ScoringRuleSet` | Módulo compartido (también usado por Unit 6) |
| `scoring-hint`, `match-lock-countdown` cues | pantalla de predicción | Unit 5 (componentes entregados aquí) |
| `RulesStep` | `OnboardingClient` | Unit 1 (extendido aquí) |

## Resumen de archivos nuevos/modificados (orientativo para code generation)

**Nuevos**:
- `src/app/page.tsx` (reemplaza placeholder) + componentes de landing
- `src/app/rules/page.tsx` + `RulesCenterPage` y subcomponentes
- `src/features/education/components/scoring-calculator.tsx`
- `src/features/education/components/score-breakdown-explainer.tsx`
- `src/features/education/components/dismissible-callout.tsx`
- `src/features/education/components/info-popover.tsx`
- `src/features/education/services/compute-score.ts` (+ `scoring-rules.ts` con `ScoringRuleSet`)
- `src/features/profile/components/rules-step.tsx`
- `src/i18n/*` y `content/rules/*.mdx`

**Modificados**:
- `src/features/profile/components/onboarding-progress-indicator.tsx` (+paso rules)
- `src/app/onboarding/profile/onboarding-client.tsx` (+estado rules)
- `src/proxy.ts` (quitar `/rules` de rutas públicas)
