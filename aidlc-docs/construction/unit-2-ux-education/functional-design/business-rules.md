# Unit 2: UX Education and Onboarding — Business Rules

> Reglas de decisión, validación y restricciones del unit. Cada regla tiene un identificador `BR-2.x` para trazabilidad.

---

## Reglas de puntuación (canónicas — compartidas con Unit 6)

> Estas reglas son la **fuente de verdad educativa** y deben coincidir exactamente con el scoring autoritativo de Unit 6 (US-5.1). Materializadas en `ScoringRuleSet`.

| ID | Regla |
|---|---|
| **BR-2.1** | Acertar el marcador exacto (local y visitante) otorga **5 puntos**. |
| **BR-2.2** | Si no hay marcador exacto, acertar el resultado (ganador o empate) suma **2 puntos**. |
| **BR-2.3** | Si no hay marcador exacto, acertar la cantidad de goles de cada equipo suma **1 punto por equipo acertado** (0, 1 o 2). Estos puntos se acumulan con BR-2.2. Ejemplo: real `BRA 2-1 ARG`, predicción `BRA 3-2 ARG` ⇒ 2 por ganador + 1 por gol de ARG = **3 puntos**. |
| **BR-2.4** | Fallar todo (ni marcador, ni resultado, ni goles de un equipo) otorga **0 puntos**. |
| **BR-2.5** | En fases knockout, si el partido terminó empatado en el marcador y el usuario predijo correctamente al ganador de penales, se otorga **+1 punto adicional** sobre el puntaje base. |
| **BR-2.6** | El bonus de penales (BR-2.5) **solo** aplica cuando: la fase es knockout **Y** el marcador real es empate **Y** existe predicción de ganador de penales. En cualquier otro caso el bonus es 0. |
| **BR-2.7** | La calculadora educativa nunca define constantes propias: importa `ScoringRuleSet`. Si las constantes cambian, la educación y el scoring real cambian juntos. |

---

## Reglas de contenido y acceso a reglas

| ID | Regla |
|---|---|
| **BR-2.8** | El contenido de reglas se almacena en archivos MDX versionados en el repositorio; cambios de copy requieren deploy (no edición en runtime). |
| **BR-2.9** | La landing pública (`/`) muestra **únicamente** el teaser de puntuación como contenido de reglas. No existe una página `/rules` pública. |
| **BR-2.10** | El Rules Center completo (`/rules`) requiere sesión iniciada. Un usuario no autenticado que navegue a `/rules` es redirigido a `/sign-in`. |
| **BR-2.11** | El Rules Center debe incluir, como mínimo, las secciones: puntuación, predicción de penales, deadline de bloqueo, comportamiento de empates en ranking, y límite/expulsión de miembros de pool. |
| **BR-2.12** | El ranking es **por pool**, nunca global. Toda copy educativa que mencione posiciones debe dejarlo explícito (mitiga el UX risk del screen contract). |
| **BR-2.13** | En caso de empate de puntos en el ranking, los usuarios comparten la misma posición; no hay criterio de desempate. La copy debe explicarlo (consistente con US-5.2). |
| **BR-2.14** | Si un bloque de contenido dinámico (ej. ejemplos calculados) falla al cargar, se degrada con gracia mostrando el contenido estático; nunca se rompe la página. |

---

## Reglas de cues educativos

| ID | Regla |
|---|---|
| **BR-2.15** | Los cues de tipo `dismissible-callout` se muestran por defecto y pueden descartarse permanentemente por navegador. |
| **BR-2.16** | El estado de descarte de un cue se guarda en `localStorage` bajo la clave `cue:dismissed:{id}`; no se sincroniza entre dispositivos ni navegadores. |
| **BR-2.17** | Los cues de tipo `info-popover` están siempre disponibles vía icono de información y **no** tienen estado de descarte. |
| **BR-2.18** | Si `localStorage` no está disponible (incógnito, SSR, bloqueo), los callouts se muestran por defecto (fail-open hacia educación) y nunca rompen el render. |
| **BR-2.19** | Ningún cue educativo bloquea una acción del usuario; son siempre informativos y no intrusivos. |

---

## Reglas de onboarding

| ID | Regla |
|---|---|
| **BR-2.20** | El orden de pasos del onboarding es: `nickname → avatar → rules → passkey`. |
| **BR-2.21** | El paso `rules` es **saltable**: ofrece "Continuar" y "Saltar por ahora", y ambas avanzan al siguiente paso. |
| **BR-2.22** | El paso `rules` **no** persiste estado de "reglas leídas" en base de datos; el usuario puede acceder al Rules Center en cualquier momento. |
| **BR-2.23** | El paso `nickname` permanece como gate duro (regla heredada de Unit 1); `rules`, `avatar` y `passkey` son saltables. |
| **BR-2.24** | El indicador de progreso del onboarding debe reflejar los 4 pasos, marcando el paso actual y los completados. |

---

## Reglas de landing y pools

| ID | Regla |
|---|---|
| **BR-2.25** | La sección de preview de pools de la landing se cablea a la interfaz `PoolPreviewItem`; mientras Unit 3 no provea datos, renderiza estado skeleton o vacío. |
| **BR-2.26** | Si la fuente de datos de pools falla, la sección de preview se oculta y la landing mantiene su explicación estática. |
| **BR-2.27** | La landing debe presentar, en el primer viewport mobile, la propuesta de valor, el teaser de puntuación y el CTA principal `Entra a Jugar` (actualizado por Unit 18). |

---

## Reglas de internacionalización

| ID | Regla |
|---|---|
| **BR-2.28** | Toda copy de UI y educativa referencia una clave de diccionario; no se permiten strings literales de cara al usuario embebidos en componentes. **Unit 24 materializa esta regla a escala de toda la app**: auth, onboarding, settings, pools, predictions, competition, admin, notifications, páginas, metadata, `aria-label`, toasts y errores. |
| **BR-2.29** | El idioma por defecto es español (`es`). Desde **Unit 24**, los idiomas activos son `es` y `en`; la estrategia sigue siendo i18n sin prefijo `[locale]` en URL (Opción A), con selector de idioma, cookie/perfil y contenido MDX bilingüe (`content/rules/es` + `content/rules/en`). |

---

## Reglas fuera de alcance (explícitas)

| ID | Regla |
|---|---|
| **BR-2.30** | Unit 2 **no** crea tablas nuevas en base de datos ni migraciones. |
| **BR-2.31** | Unit 2 **no** implementa SEO avanzado (JSON-LD, sitemap, métricas CWV como criterio); solo se asume HTML semántico básico. |
| **BR-2.32** | Los pasos de "acción de pool" y "primera predicción" del screen contract de onboarding **no** se construyen en Unit 2; los añaden Units 3 y 5 respectivamente. |
| **BR-2.33** | La pantalla de leaderboard y su desglose de puntos se construyen en Unit 6; Unit 2 solo entrega el componente reutilizable `ScoreBreakdownExplainer` y su demo en el Rules Center. |
