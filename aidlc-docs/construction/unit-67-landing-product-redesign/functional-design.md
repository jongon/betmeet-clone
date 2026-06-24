# Functional Design (Light) — Unit 67: Landing de producto estilo startup

## Stage
- **Unit**: 67 — Landing de producto estilo startup
- **Stage**: Functional Design (Light)
- **Created**: 2026-06-24
- **Status**: Aprobado — plan presentado y aprobado antes de ejecutar (`/aidlc:refine`).

## Contexto
Refine vía `/aidlc:refine` — *"Me gustaría mejorar el landing. El landing tiene que ser atractivo y explicativo de lo que un usuario podría hacer en la aplicación. Explicación de pool publicos privados, invitaciones, reglas, ejemplos. Como una navegación de una landing de un producto de start up. Acepto preguntas pero confiaré en tus criterios para hacerlo atractivo".*

El landing (`src/app/page.tsx`) solo renderizaba `<LandingHero />` (píldora de marca + título + subtítulo + 1 CTA) y `<ScoringTeaser />` (tarjeta con la tabla de puntuación). **No explicaba qué puede hacer un usuario**: nada sobre ligas públicas/privadas, invitaciones, reglas con ejemplos ni navegación de producto. Es una brecha de **experiencia/explicabilidad del producto**, no de capacidad (todas las features ya existen y están implementadas en Units previas). Decisiones aprobadas vía AskUserQuestion: (1) **alcance** = landing completo de startup; (2) **nav** = navegación sticky de anclas solo para visitantes anónimos.

## Business Logic Model
```
src/app/page.tsx  (Server Component, max-w-5xl, scroll-smooth)
├── <header>
│   ├── logo
│   ├── <nav> anclas  ← SOLO si !profile (#how-it-works,#leagues,#scoring,#faq)  [BR-67.1]
│   └── LanguageMenu · BrandToggle · ThemeToggle · (UserMenu | SignIn/SignUp)
├── <LandingHero/>            (client) → +CTA secundario "#how-it-works" + tagline   [BR-67.2]
└── div.space-y-16
    ├── <HowItWorks/>         id=how-it-works · 4 pasos (Card + icono + nº)          [BR-67.2]
    ├── <LeagueTypes/>        id=leagues · Pública vs Privada (2 Card + Badge brand) [BR-67.3]
    ├── <FeatureGrid/>        4 features (invitaciones, reglas, ranking vivo, justa) [BR-67.4]
    ├── section id=scoring  → <ScoringTeaser/> (tabla + <ScoreBreakdownDemo/>)       [BR-67.8]
    ├── <LandingFaq/>         id=faq · Accordion 6 preguntas                          [BR-67.5]
    ├── <FinalCta/>           banda bg-brand/10 → /sign-up                            [BR-67.6]
    └── <LandingFooter/>      appName + enlaces SOLO públicos (#scoring,#faq,/sign-*) [BR-67.7]
```
Copy 100% desde el diccionario tipado (`landing.*`), añadido en `es.ts` (fuente de verdad) y `en.ts` con paridad de claves. Cada sección es un Server Component (`getRequestLocale()` + `getDictionary()`), igual que `ScoringTeaser`.

## Business Rules
| ID | Regla |
|----|-------|
| **BR-67.1** | La nav de anclas (Cómo funciona · Ligas · Puntos · Preguntas) se muestra **solo a visitantes anónimos** (`!profile`) y se oculta en móvil (`hidden md:flex`). El usuario logueado conserva el header actual (sin anclas). |
| **BR-67.2** | El hero gana un CTA secundario "Ver cómo funciona" (ancla `#how-it-works`) + una línea de refuerzo (`heroTagline`), y la sección "Cómo funciona" presenta 4 pasos (crear/unirse → predecir → puntuar → escalar ranking). |
| **BR-67.3** | La sección "Ligas" explica **pública vs privada** con datos reales: pública = directorio público + unión libre + nombre único; privada = invitación por enlace/token + hasta 100 miembros + expulsión pre-partido. |
| **BR-67.4** | El grid de features resume invitaciones, centro de reglas, ranking en vivo y puntuación justa — texto informativo, sin enlaces a rutas autenticadas. |
| **BR-67.5** | El FAQ (Accordion) responde: coste, invitaciones, pública vs privada, varias ligas, bloqueo al kickoff y cálculo de puntos. |
| **BR-67.6** | La banda CTA final dirige a la ruta pública existente `/sign-up`. |
| **BR-67.7** | El footer solo enlaza a superficies **públicas** (`#scoring`, `#faq`, `/sign-in`, `/sign-up`); **no** enlaza `/rules` ni otras rutas bajo `(app)` para no rebotar a anónimos a un gate de sesión. |
| **BR-67.8** | Los "ejemplos" se cubren reutilizando `<ScoreBreakdownDemo />` (ya computa con el motor real `computeScore`); **sin** lógica de puntuación nueva. |
| **BR-67.9** | Paridad i18n es/en obligatoria: toda clave nueva vive en `landing.*` de ambos diccionarios; `tsc` falla si falta alguna (la forma de `es` es el contrato `Dictionary`). |

## Stages
- **Requirements / User Stories**: EXECUTE (Épica 67 / FR-REFINE-67.1, US-67.1, US-67.2).
- **Application Design**: EXECUTE (delta `unit-of-work.md` — bloque Unit 67 + #50 en la secuencia).
- **Functional Design**: EXECUTE (este documento).
- **Code Generation**: EXECUTE.
- **Build and Test**: EXECUTE.
- **SKIP**: Reverse Engineering, Units Generation, NFR Requirements/Design, Infrastructure.

## Security Baseline
COMPLIANT — cambio solo de presentación. Sin nueva superficie de input, datos ni PII; sin server actions, schema, migraciones ni rutas nuevas. Todos los CTAs/enlaces apuntan a rutas públicas ya existentes (`/sign-up`, `/sign-in`) o a anclas internas; ninguno expone rutas autenticadas a anónimos (BR-67.7). La resolución de locale (Unit 24/64) queda intacta.

## Out of scope
- Imágenes/capturas/ilustraciones nuevas (solo iconos lucide + tokens existentes).
- Routing `[locale]`, hreflang/SEO avanzado, animaciones complejas.
- Cambiar el contenido MDX del Rules Center o el motor de puntuación.
- Nuevas server actions, schema, migraciones o rutas.

## Primary Deliverable
Un visitante anónimo entiende de un vistazo cómo funciona el juego, la diferencia entre ligas públicas y privadas, cómo invitar, cómo se puntúa (con ejemplos resueltos) y resuelve dudas en un FAQ — con navegación de producto tipo startup, todo bilingüe ES/EN y responsive.
