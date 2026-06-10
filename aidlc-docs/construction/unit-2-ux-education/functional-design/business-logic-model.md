# Unit 2: UX Education and Onboarding — Business Logic Model

> Lógica técnico-agnóstica del unit. Se enfoca en algoritmos de presentación educativa, cálculo de puntaje de demostración, gestión de cues y extensión del flujo de onboarding.

---

## BL-1: Cálculo de puntaje educativo (calculadora interactiva)

**Propósito**: Permitir al usuario introducir una predicción hipotética y un resultado, y ver los puntos calculados en vivo (decisión Q5=B). Es una **vista previa cliente** que reusa `ScoringRuleSet` (no define reglas propias).

**Entrada**: `ScoringExample` (predichos, reales, isKnockout, ganadores de penales).

**Algoritmo** (`computeScore`):

```
function computeScore(example) -> ScoreBreakdown:
    p_home, p_away = example.predictedHome, example.predictedAway
    a_home, a_away = example.actualHome, example.actualAway

    predicted_result = sign(p_home - p_away)   // 1 local, 0 empate, -1 visitante
    actual_result    = sign(a_home - a_away)

    // 1. Marcador exacto
    if p_home == a_home AND p_away == a_away:
        matchedCase = EXACT
        basePoints  = ScoringRuleSet.EXACT_SCORE        // 5

    // 2. Resultado correcto (ganador/empate) sin marcador exacto
    else if predicted_result == actual_result:
        matchedCase = RESULT
        basePoints  = ScoringRuleSet.CORRECT_RESULT     // 2

    // 3. Acertó goles de UN equipo y falló el resultado
    else if (p_home == a_home OR p_away == a_away):
        matchedCase = PARTIAL
        basePoints  = ScoringRuleSet.PARTIAL_GOAL_COUNT // 1

    // 4. Falló todo
    else:
        matchedCase = MISS
        basePoints  = ScoringRuleSet.MISS               // 0

    // 5. Bonus de penales (solo knockout con empate en el marcador)
    penaltyApplied = false
    penaltyPoints  = 0
    if example.isKnockout
       AND a_home == a_away
       AND example.predictedPenaltyWinner != null
       AND example.predictedPenaltyWinner == example.actualPenaltyWinner:
        penaltyApplied = true
        penaltyPoints  = ScoringRuleSet.PENALTY_BONUS   // +1

    return ScoreBreakdown {
        matchedCase, basePoints, penaltyApplied, penaltyPoints,
        totalPoints = basePoints + penaltyPoints,
        explanationKey = explanationKeyFor(matchedCase, penaltyApplied)
    }
```

**Notas de consistencia**:
- `sign()` clasifica el resultado en {local, empate, visitante}.
- La regla 3 (PARTIAL) exige que el caso 1 y 2 ya hayan fallado: acertar los goles de un equipo *y* fallar el ganador/empate. Si acertara el resultado caería en caso 2.
- **Invariante crítico**: este algoritmo y el de Unit 6 deben producir resultados idénticos para la misma entrada. Por eso ambos importan `ScoringRuleSet` y, idealmente, la misma función `computeScore`. La calculadora educativa puede vivir como función pura compartida.

---

## BL-2: Carga y composición del contenido de reglas

**Propósito**: Servir contenido educativo desde archivos MDX (decisión Q3) repartido entre teaser público y Rules Center privado (decisión Q4).

**Lógica**:
1. Los `RuleDocument` se compilan en build time desde `/content/rules/*.mdx` (o equivalente).
2. **Teaser público** (`audience = teaser`): un único resumen de puntuación embebido en la landing (`/`). No es una ruta navegable de reglas.
3. **Rules Center completo** (`audience = full`): renderizado en `/rules`, accesible solo con sesión iniciada. Reúne todas las secciones (`scoring`, `penalties`, `match-locks`, `ties`, `pools`) en acordeones.
4. Si una sección dinámica (ej. ejemplos calculados) falla, degrada con gracia mostrando el contenido estático (estado `error` del screen contract).

**Control de acceso**: `/rules` se elimina de las rutas públicas del `proxy.ts`. Un usuario no autenticado que navegue a `/rules` es redirigido a `/sign-in` por la lógica de gateo existente.

---

## BL-3: Gestión de cues educativos

**Propósito**: Mostrar educación contextual sin bloquear el juego (decisión Q6=C mixto, Q7=A localStorage).

**Dos tipos**:

### a) Callout descartable (`dismissible-callout`)
```
function shouldShowCallout(cueId) -> boolean:
    return localStorage.get("cue:dismissed:" + cueId) != "1"

function dismissCallout(cueId):
    localStorage.set("cue:dismissed:" + cueId, "1")
```
- Visible por defecto hasta que el usuario lo descarta.
- Una vez descartado, permanece oculto en ese navegador (no sincroniza entre dispositivos).
- Robusto ante ausencia de localStorage (modo incógnito/SSR): si no hay acceso, se muestra el callout (fail-open hacia mostrar educación), nunca rompe el render.

### b) Info popover (`info-popover`)
- Siempre disponible vía icono de información.
- Sin estado de descarte. No usa localStorage.

**Cues iniciales** (mínimo del screen contract):
| id | kind | contexto |
|---|---|---|
| `nickname-discriminator` | dismissible-callout | Onboarding paso nickname / perfil |
| `scoring-hint` | info-popover | Cerca de inputs de puntuación (contrato de componente para Unit 5) |
| `match-lock-countdown` | info-popover | Junto al countdown de bloqueo (contrato para Unit 5) |
| `ranking-pool-only` | dismissible-callout | Rules Center / leaderboard (aclara que el ranking es por pool, no global) |

> Los cues de `scoring-hint` y `match-lock-countdown` se entregan como **contratos de componente** reutilizables; sus pantallas ancla (predicción, leaderboard) se construyen en Units 5 y 6.

---

## BL-4: Extensión del flujo de onboarding (paso "rules")

**Propósito**: Insertar un paso educativo de reglas en el onboarding, saltable (decisión Q2=A, Q8=B).

**Orden de pasos**: `nickname → avatar → rules → passkey`.

**Lógica del paso `rules`**:
```
RulesStep:
    render: resumen de puntuación + acceso al Rules Center completo
    primaryAction "Continuar"   -> avanza a paso passkey
    secondaryAction "Saltar por ahora" -> avanza a paso passkey
    // Ambas acciones avanzan; el paso nunca bloquea (saltable)
```

- A diferencia de `nickname` (gate duro de Unit 1), `rules` **no** bloquea la finalización del onboarding.
- No persiste estado de "reglas vistas" en DB. El usuario siempre puede volver al Rules Center.
- El `OnboardingProgressIndicator` se actualiza para incluir el paso `rules` (4 pasos en total).

**Integración**: extiende `OnboardingClient` (Unit 1) añadiendo el estado de paso `"rules"` entre `"avatar"` y `"passkey"`. No se reescribe la máquina de pasos existente; se inserta el nuevo estado.

---

## BL-5: Composición de la landing pública

**Propósito**: Página `/` que explica la quiniela antes de registrarse (reemplaza el placeholder del template).

**Bloques** (orden mobile-first, una propuesta de valor primero):
1. **Hero + propuesta de valor**: qué es una quiniela, foco Mundial 2026, CTA principal `Crear mi quiniela`.
2. **Teaser de puntuación**: tarjeta compacta (exacto 5 / resultado 2 / parcial 1 / penales +1). Es el único contenido de reglas público.
3. **PoolPreview**: sección cableada a la interfaz `PoolPreviewItem` (Unit 3). Renderiza skeleton mientras carga; si no hay fuente de datos (pre-Unit 3) muestra estado vacío; si falla, se oculta y mantiene la explicación estática.
4. **CTAs secundarios**: `Iniciar sesión`, `Explorar pools públicos` (este último activo cuando Unit 3 entregue datos).

**Degradación**: ningún bloque dinámico debe romper la landing. Errores de datos → se oculta el bloque dinámico, nunca la explicación estática (estado `error` del contrato).

---

## BL-6: Internacionalización de la copy

**Propósito**: Todo el texto educativo y de UI estructurado para i18n desde el día uno, español como idioma activo (decisión Q10=B).

**Lógica**:
- Toda copy mostrada referencia una **clave de diccionario**, no string literal embebido.
- Diccionario inicial: `es` (español). Estructura preparada para añadir `en` u otros sin refactor.
- El contenido MDX de reglas también se organiza por idioma (carpeta/sufijo de locale).
- Los `explanationKey`, `copyKey`, `title` de las entidades son claves de este diccionario.

---

## Flujos de datos (resumen)

| Flujo | Origen | Transformación | Destino |
|---|---|---|---|
| Cálculo de puntaje demo | Input usuario (ScoringExample) | `computeScore` (BL-1) | ScoreBreakdownExplainer |
| Contenido de reglas | MDX en repo | Compilación build (BL-2) | Landing teaser / Rules Center |
| Descarte de cue | Acción usuario | `dismissCallout` (BL-3) | localStorage |
| Paso onboarding rules | Estado cliente | Máquina de pasos (BL-4) | Avance a passkey |
| Preview de pools | Interfaz Unit 3 | Estado loading/empty/error (BL-5) | Sección landing |
